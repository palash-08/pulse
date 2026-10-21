export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  url?: string;
  color: number;
  fields?: DiscordEmbedField[];
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
}

export interface DiscordWebhookPayload {
  username?: string;
  avatar_url?: string;
  embeds: DiscordEmbed[];
}

export const DISCORD_COLORS = {
  DOWN: 0xe11d48, // Rose 600
  RECOVERY: 0x10b981, // Emerald 500
  SSL_WARNING: 0xf59e0b, // Amber 500
  TEST: 0x6366f1, // Indigo 500
};

export function buildDownEmbed(params: {
  monitorName: string;
  monitorUrl: string;
  incidentId?: number;
  statusCode?: number | null;
  errorSummary?: string | null;
  startedAt?: Date;
}): DiscordEmbed {
  const fields: DiscordEmbedField[] = [
    { name: "Target URL", value: params.monitorUrl, inline: false },
    {
      name: "Status / Error",
      value: params.errorSummary || (params.statusCode ? `HTTP ${params.statusCode}` : "Connection Failed"),
      inline: true,
    },
  ];

  if (params.incidentId) {
    fields.push({ name: "Incident #", value: `#${params.incidentId}`, inline: true });
  }

  return {
    title: `🚨 Service Outage Detected: ${params.monitorName}`,
    description: `Pulse detected that **${params.monitorName}** is currently down and inaccessible.`,
    color: DISCORD_COLORS.DOWN,
    fields,
    timestamp: (params.startedAt || new Date()).toISOString(),
    footer: {
      text: "Pulse Monitoring • Alert Dispatcher",
    },
  };
}

export function buildRecoveryEmbed(params: {
  monitorName: string;
  monitorUrl: string;
  durationSeconds?: number | null;
  responseTimeMs?: number | null;
  resolvedAt?: Date;
}): DiscordEmbed {
  const fields: DiscordEmbedField[] = [
    { name: "Target URL", value: params.monitorUrl, inline: false },
  ];

  if (params.durationSeconds !== undefined && params.durationSeconds !== null) {
    const mins = Math.floor(params.durationSeconds / 60);
    const secs = params.durationSeconds % 60;
    const durStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    fields.push({ name: "Outage Duration", value: durStr, inline: true });
  }

  if (params.responseTimeMs !== undefined && params.responseTimeMs !== null) {
    fields.push({ name: "Response Time", value: `${params.responseTimeMs} ms`, inline: true });
  }

  return {
    title: `✅ Service Recovered: ${params.monitorName}`,
    description: `Service **${params.monitorName}** has recovered and is now passing health checks.`,
    color: DISCORD_COLORS.RECOVERY,
    fields,
    timestamp: (params.resolvedAt || new Date()).toISOString(),
    footer: {
      text: "Pulse Monitoring • Alert Dispatcher",
    },
  };
}

export function buildSslExpiryEmbed(params: {
  monitorName: string;
  monitorUrl: string;
  daysRemaining: number | null;
  validTo?: Date | null;
  issuer?: string | null;
  isExpired?: boolean;
}): DiscordEmbed {
  const isExpired = params.isExpired || (params.daysRemaining !== null && params.daysRemaining <= 0);
  const fields: DiscordEmbedField[] = [
    { name: "Target URL", value: params.monitorUrl, inline: false },
    {
      name: "Days Remaining",
      value: params.daysRemaining !== null ? `${params.daysRemaining} days` : "Unknown",
      inline: true,
    },
  ];

  if (params.validTo) {
    fields.push({
      name: "Expiration Date",
      value: params.validTo.toUTCString(),
      inline: true,
    });
  }

  if (params.issuer) {
    fields.push({
      name: "Issuer",
      value: params.issuer,
      inline: true,
    });
  }

  return {
    title: isExpired
      ? `🚨 SSL Certificate Expired: ${params.monitorName}`
      : `⚠️ SSL Certificate Expiring Soon: ${params.monitorName}`,
    description: isExpired
      ? `The TLS/SSL certificate for **${params.monitorName}** has expired. Visitors may encounter security warnings.`
      : `The TLS/SSL certificate for **${params.monitorName}** will expire in **${params.daysRemaining} days**. Please renew soon.`,
    color: isExpired ? DISCORD_COLORS.DOWN : DISCORD_COLORS.SSL_WARNING,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: "Pulse Monitoring • SSL Certificate Tracker",
    },
  };
}

export function buildTestEmbed(userName?: string): DiscordEmbed {
  return {
    title: "🧪 Pulse Alert Dispatcher: Test Notification",
    description:
      "Success! Your Discord webhook destination is properly configured and verified. You will receive real-time notifications here when services fail, recover, or certificates approach expiration.",
    color: DISCORD_COLORS.TEST,
    fields: [
      { name: "Configured By", value: userName || "Account Owner", inline: true },
      { name: "Status", value: "Verified & Active", inline: true },
    ],
    timestamp: new Date().toISOString(),
    footer: {
      text: "Pulse Monitoring • Alert Dispatcher",
    },
  };
}

/**
 * Sends a structured payload to a Discord Webhook URL.
 * Enforces Discord domain check and handles error responses.
 */
export async function sendDiscordWebhook(
  webhookUrl: string,
  payload: DiscordWebhookPayload
): Promise<{ success: boolean; statusCode: number; error?: string }> {
  const DISCORD_REGEX = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//i;
  if (!DISCORD_REGEX.test(webhookUrl)) {
    return {
      success: false,
      statusCode: 400,
      error: "Invalid Discord webhook URL format",
    };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: "Pulse Monitor",
        ...payload,
      }),
    });

    if (response.status === 204 || response.status === 200) {
      return { success: true, statusCode: response.status };
    }

    const text = await response.text();
    return {
      success: false,
      statusCode: response.status,
      error: `Discord returned HTTP ${response.status}: ${text.slice(0, 200)}`,
    };
  } catch (err: any) {
    return {
      success: false,
      statusCode: 0,
      error: err.message || "Network error sending to Discord webhook",
    };
  }
}
