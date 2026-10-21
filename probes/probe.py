#!/usr/bin/env python3
"""
Pulse Distributed Probe Worker (Python 3 - Standard Library Only)
Zero pip dependencies required. Works on any standard Python 3.8+ installation.
"""

import os
import sys
import time
import json
import socket
import random
import urllib.request
import urllib.error

# Configuration
PULSE_URL = os.environ.get("PULSE_URL", "http://localhost:4000").rstrip("/")
PROBE_API_KEY = os.environ.get("PROBE_API_KEY", "pulse_probe_secret_key_123")
PROBE_ID = os.environ.get("PROBE_ID", f"vm-{socket.gethostname().lower()}")
PROBE_REGION = os.environ.get("PROBE_REGION", "us-east")
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "30"))
CHECK_TIMEOUT_SECONDS = int(os.environ.get("CHECK_TIMEOUT_SECONDS", "8"))
RUN_ONCE = os.environ.get("RUN_ONCE", "false").lower() == "true" or "--once" in sys.argv

def log(level: str, msg: str):
    ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    print(f"[{ts}] [{level}] [{PROBE_ID}] {msg}", flush=True)

def fetch_monitors():
    req = urllib.request.Request(
        f"{PULSE_URL}/api/internal/monitors",
        headers={"x-probe-key": PROBE_API_KEY, "Accept": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data.get("monitors", [])

def ping_target(monitor):
    start = time.perf_counter()
    req = urllib.request.Request(
        monitor["url"],
        headers={"User-Agent": f"Pulse-Probe/{PROBE_ID} ({PROBE_REGION})"}
    )
    try:
        with urllib.request.urlopen(req, timeout=CHECK_TIMEOUT_SECONDS) as resp:
            elapsed_ms = int((time.perf_counter() - start) * 1000)
            status_code = resp.getcode()
            is_success = 200 <= status_code < 400
            return {
                "monitorId": monitor["id"],
                "isSuccessful": is_success,
                "statusCode": status_code,
                "responseTimeMs": elapsed_ms,
                "errorSummary": None if is_success else f"HTTP {status_code}"
            }
    except urllib.error.HTTPError as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "monitorId": monitor["id"],
            "isSuccessful": False,
            "statusCode": e.code,
            "responseTimeMs": elapsed_ms,
            "errorSummary": f"HTTP {e.code} Error"
        }
    except Exception as e:
        elapsed_ms = int((time.perf_counter() - start) * 1000)
        return {
            "monitorId": monitor["id"],
            "isSuccessful": False,
            "statusCode": None,
            "responseTimeMs": elapsed_ms,
            "errorSummary": str(e)[:200]
        }

def submit_results(results):
    payload = {
        "probeId": PROBE_ID,
        "region": PROBE_REGION,
        "results": results
    }
    req = urllib.request.Request(
        f"{PULSE_URL}/api/internal/check-results",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "x-probe-key": PROBE_API_KEY
        },
        method="POST"
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_cycle():
    try:
        monitors = fetch_monitors()
        if not monitors:
            log("INFO", "No monitors to check.")
            return

        results = [ping_target(m) for m in monitors]
        up_count = sum(1 for r in results if r["isSuccessful"])
        res = submit_results(results)
        log("INFO", f"Submitted {len(results)} checks ({up_count} UP, {len(results) - up_count} DOWN). Status: {res.get('message')}")
    except Exception as e:
        log("ERROR", f"Cycle failed: {e}")

def main():
    log("INFO", f"Starting Pulse Python Probe (Pulse: {PULSE_URL}, Region: {PROBE_REGION})")
    if RUN_ONCE:
        run_cycle()
        return

    while True:
        run_cycle()
        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
