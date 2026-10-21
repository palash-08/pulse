#!/usr/bin/env bash
# Pulse Minimal Probe Worker (Bash + curl + jq)
# Suitable for cron or lightweight Linux VMs.
set -euo pipefail

PULSE_URL="${PULSE_URL:-http://localhost:4000}"
PROBE_API_KEY="${PROBE_API_KEY:-pulse_probe_secret_key_123}"
PROBE_ID="${PROBE_ID:-vm-$(hostname -s)}"
PROBE_REGION="${PROBE_REGION:-us-east}"
TIMEOUT="${TIMEOUT:-8}"

# 1. Fetch monitors
MONITORS_JSON=$(curl -s -f -H "x-probe-key: ${PROBE_API_KEY}" "${PULSE_URL}/api/internal/monitors")
MONITOR_COUNT=$(echo "${MONITORS_JSON}" | jq '.monitors | length')

if [ "${MONITOR_COUNT}" -eq 0 ]; then
  echo "[$(date -Iseconds)] No monitors found."
  exit 0
fi

# 2. Iterate and ping each monitor
RESULTS="[]"
for row in $(echo "${MONITORS_JSON}" | jq -r '.monitors[] | @base64'); do
  _jq() {
    echo "${row}" | base64 --decode | jq -r "${1}"
  }

  MONITOR_ID=$(_jq '.id')
  URL=$(_jq '.url')

  # Measure response time and HTTP status code
  HTTP_INFO=$(curl -s -o /dev/null -w "%{http_code}:%{time_total}" -m "${TIMEOUT}" "${URL}" || echo "000:0")
  HTTP_CODE=$(echo "${HTTP_INFO}" | cut -d':' -f1)
  TOTAL_SEC=$(echo "${HTTP_INFO}" | cut -d':' -f2)
  MS=$(awk "BEGIN {print int(${TOTAL_SEC} * 1000)}")

  IS_SUCCESS=false
  ERR_SUMMARY="null"
  if [ "${HTTP_CODE}" -ge 200 ] && [ "${HTTP_CODE}" -lt 400 ]; then
    IS_SUCCESS=true
  else
    ERR_SUMMARY="\"HTTP ${HTTP_CODE} Outage\""
  fi

  ITEM=$(cat <<EOF
{
  "monitorId": ${MONITOR_ID},
  "isSuccessful": ${IS_SUCCESS},
  "statusCode": ${HTTP_CODE},
  "responseTimeMs": ${MS},
  "errorSummary": ${ERR_SUMMARY}
}
EOF
)
  RESULTS=$(echo "${RESULTS}" | jq ". += [${ITEM}]")
done

# 3. Post batch results back to Pulse
PAYLOAD=$(jq -n \
  --arg pid "${PROBE_ID}" \
  --arg reg "${PROBE_REGION}" \
  --argjson res "${RESULTS}" \
  '{probeId: $pid, region: $reg, results: $res}')

curl -s -f -X POST \
  -H "Content-Type: application/json" \
  -H "x-probe-key: ${PROBE_API_KEY}" \
  -d "${PAYLOAD}" \
  "${PULSE_URL}/api/internal/check-results" > /dev/null

echo "[$(date -Iseconds)] [${PROBE_ID}] Submitted ${MONITOR_COUNT} checks to Pulse."
