import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Lock,
  RefreshCw,
  Clock,
  Calendar,
  Award,
  Globe,
} from "lucide-react";
import { SslCheck } from "../../api/types.js";

interface SslCertificateCardProps {
  isHttps: boolean;
  ssl: SslCheck | null;
  onRefreshSsl: () => void;
  refreshing: boolean;
  successMessage?: string | null;
}

export function SslCertificateCard({
  isHttps,
  ssl,
  onRefreshSsl,
  refreshing,
  successMessage,
}: SslCertificateCardProps) {
  if (!isHttps) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 text-neutral-400 dark:text-neutral-500">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">SSL Certificate Tracking: Not Applicable</div>
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-0.5">
              This monitor is configured over plain HTTP. Update the URL to HTTPS to enable automated TLS inspection and expiry alerts.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = ssl ? (ssl.daysRemaining !== null && ssl.daysRemaining <= 0) || !ssl.isValid : false;
  const isExpiringSoon = ssl ? ssl.daysRemaining !== null && ssl.daysRemaining > 0 && ssl.daysRemaining <= 30 : false;

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 sm:p-8 space-y-5 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              !ssl
                ? "bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400"
                : isExpired
                ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60"
                : isExpiringSoon
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/60"
            }`}
          >
            {!ssl ? (
              <Lock className="w-5 h-5" />
            ) : isExpired ? (
              <ShieldX className="w-5 h-5" />
            ) : isExpiringSoon ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <ShieldCheck className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-serif font-bold text-neutral-900 dark:text-white">
                SSL / TLS Certificate Tracker
              </h2>
              {ssl && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    isExpired
                      ? "bg-rose-600 text-white"
                      : isExpiringSoon
                      ? "bg-amber-500 text-white"
                      : "bg-emerald-600 text-white"
                  }`}
                >
                  {isExpired
                    ? "Certificate Expired / Invalid"
                    : isExpiringSoon
                    ? `Expiring in ${ssl.daysRemaining} days`
                    : "Certificate Valid"}
                </span>
              )}
            </div>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
              Continuously verifies peer certificate chains, TLS cipher handshake, and days until expiration.
            </p>
          </div>
        </div>

        <button
          onClick={onRefreshSsl}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-200 text-white dark:text-neutral-900 text-xs font-medium rounded-full shadow-xs transition-all active:scale-[0.99] disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Inspecting TLS..." : "Check Certificate Now"}
        </button>
      </div>

      {successMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          {successMessage}
        </div>
      )}

      {!ssl ? (
        <div className="p-5 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl text-center space-y-1">
          <p className="text-xs text-neutral-600 dark:text-neutral-300 font-medium">No SSL inspection recorded yet.</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
            Click "Check Certificate Now" to initiate a TLS handshake and inspect the certificate.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {ssl.errorMessage && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2">
              <ShieldX className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
              <span>
                <strong>Certificate Warning:</strong> {ssl.errorMessage}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Days Remaining
              </div>
              <div
                className={`text-2xl font-serif font-bold mt-1 ${
                  isExpired
                    ? "text-rose-600 dark:text-rose-400"
                    : isExpiringSoon
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}
              >
                {ssl.daysRemaining !== null ? `${ssl.daysRemaining} days` : "Unknown"}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Expiration Date
              </div>
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-2 truncate">
                {ssl.validTo ? new Date(ssl.validTo).toLocaleDateString(undefined, { dateStyle: "long" }) : "N/A"}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Award className="w-3.5 h-3.5" /> Issuer Authority
              </div>
              <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 mt-2 truncate" title={ssl.issuer || undefined}>
                {ssl.issuer || "Unknown Issuer"}
              </div>
            </div>

            <div className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-700/80">
              <div className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                <Globe className="w-3.5 h-3.5" /> Protocol / Cipher
              </div>
              <div className="text-xs font-mono font-semibold text-neutral-800 dark:text-neutral-200 mt-2">
                {ssl.protocol || "TLS"}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-400 dark:text-neutral-500 px-1 pt-1 border-t border-neutral-100 dark:border-neutral-800">
            <div>
              Subject: <span className="font-mono text-neutral-600 dark:text-neutral-300">{ssl.subject || "N/A"}</span>
            </div>
            <div>
              Last Inspected: {new Date(ssl.checkedAt).toLocaleString()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
