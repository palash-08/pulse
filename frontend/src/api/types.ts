export interface User {
  id: number;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  monitorLimit: number | null;
}

export interface MonitorSummary {
  id: number;
  name: string;
  url: string;
  checkIntervalSeconds: number;
  status: "up" | "down" | "unknown";
  lastCheckedAt: string | null;
  lastStatusCode: number | null;
  lastResponseTimeMs: number | null;
  lastError: string | null;
  hasOpenIncident: boolean;
  openIncidentStartedAt: string | null;
  isSimulatedTarget: boolean;
  reportsEnabled: boolean;
  reportToken: string | null;
  recentReports15m: number;
  sslDaysRemaining?: number | null;
  sslIsValid?: boolean | null;
  createdAt: string;
}

export interface Check {
  id: number;
  monitorId: number;
  checkedAt: string;
  isSuccessful: boolean;
  statusCode: number | null;
  responseTimeMs: number | null;
  errorSummary: string | null;
  trigger: string;
}

export interface Incident {
  id: number;
  monitorId: number;
  monitorName: string;
  status: "open" | "resolved";
  startedAt: string;
  resolvedAt: string | null;
  durationSeconds: number;
  failedChecks: number;
  firstError: string | null;
}

export interface ProblemReport {
  id: number;
  monitorId: number;
  monitorName: string;
  category: "down" | "slow" | "error" | "other";
  description: string;
  reporterEmail: string | null;
  status: "new" | "acknowledged" | "resolved" | "dismissed";
  createdAt: string;
}

export interface DashboardData {
  totals: {
    monitors: number;
    up: number;
    down: number;
    unknown: number;
    openIncidents: number;
    newReports: number;
  };
  last24h: {
    checks: number;
    uptimePct: number;
    avgResponseMs: number;
  };
  recentChecks: Array<Check & { monitorName: string }>;
  monitors: MonitorSummary[];
}

export interface ChartBucket {
  bucketStart: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  checks: number;
  failures: number;
  uptimePct: number;
}

export interface ChartData {
  range: string;
  bucket: "minute" | "hour" | "day";
  points: ChartBucket[];
}

export interface UptimeSummary {
  range: string;
  totalChecks: number;
  successfulChecks: number;
  uptimePct: number;
  avgResponseMs: number;
  minResponseMs: number;
  maxResponseMs: number;
  incidentCount: number;
}

export interface SslCheck {
  id: number;
  monitorId: number;
  checkedAt: string;
  isValid: boolean;
  issuer: string | null;
  subject: string | null;
  validFrom: string | null;
  validTo: string | null;
  daysRemaining: number | null;
  protocol: string | null;
  errorMessage: string | null;
}

export interface MonitorSslResponse {
  isHttps: boolean;
  latest: SslCheck | null;
  history: SslCheck[];
}

export interface AlertContact {
  id: number;
  userId: number;
  type: string;
  name: string;
  webhookUrl: string;
  maskedWebhookUrl: string;
  isActive: boolean;
  cooldownMinutes: number;
  notifyOnDown: boolean;
  notifyOnRecovery: boolean;
  notifyOnSslExpiry: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AlertLog {
  id: number;
  contactId: number | null;
  contactName: string | null;
  monitorId: number;
  monitorName: string;
  incidentId: number | null;
  eventType: "down" | "recovery" | "ssl_expiry" | "test";
  deliveryStatus: "success" | "failed";
  statusCode: number | null;
  errorMessage: string | null;
  sentAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Array<{ path: string; message: string }>;
}
