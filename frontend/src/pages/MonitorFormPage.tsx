import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { createMonitor, getMonitor, updateMonitor } from "../api/monitors.js";
import { ApiClientError } from "../api/client.js";
import { Spinner } from "../components/ui/Spinner.js";
import { FlairButton } from "../components/ui/FlairButton.js";
import GlideSelect from './GlideSelect';
import { useTheme } from "../context/useTheme.js";

const intervalOptions = [
  { value: 30, label: "Every 30 seconds", tag: "Fastest" },
  { value: 60, label: "Every 1 minute", tag: "Recommended" },
  { value: 120, label: "Every 2 minutes", tag: "Standard" },
  { value: 300, label: "Every 5 minutes", tag: "Light" },
  { value: 600, label: "Every 10 minutes", tag: "Infrequent" },
  { value: 1800, label: "Every 30 minutes", tag: "Hourly" },
  { value: 3600, label: "Every 1 hour", tag: "Slow" },
];

export function MonitorFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();
  const { isDark } = useTheme();

  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(60);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestLimitReached, setGuestLimitReached] = useState(false);

  useEffect(() => {
    if (isEditing && id) {
      getMonitor(Number(id))
        .then((res) => {
          setName(res.monitor.name);
          setUrl(res.monitor.url);
          setCheckIntervalSeconds(res.monitor.checkIntervalSeconds);
        })
        .catch((err) => {
          setError(err.message || "Failed to load monitor details");
        })
        .finally(() => setLoading(false));
    }
  }, [id, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGuestLimitReached(false);
    setSaving(true);

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      const lower = cleanUrl.toLowerCase();
      if (lower.startsWith("localhost") || lower.startsWith("127.0.0.1") || lower.startsWith("[::1]")) {
        cleanUrl = `http://${cleanUrl}`;
      } else {
        cleanUrl = `https://${cleanUrl}`;
      }
    }

    try {
      if (isEditing && id) {
        await updateMonitor(Number(id), { name: name.trim(), url: cleanUrl, checkIntervalSeconds });
        navigate(`/monitors/${id}`);
      } else {
        const res = await createMonitor({ name: name.trim(), url: cleanUrl, checkIntervalSeconds });
        navigate(`/monitors/${res.monitor.id}`);
      }
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        if (err.code === "GUEST_LIMIT_REACHED") {
          setGuestLimitReached(true);
        } else {
          setError(err.message);
        }
      } else {
        setError("Failed to save monitor. Please check your inputs.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <Link
        to={isEditing ? `/monitors/${id}` : "/monitors"}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {isEditing ? "Monitor Details" : "Monitors"}
      </Link>

      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 sm:p-8 transition-colors">
        <h1 className="text-2xl font-serif font-bold text-neutral-900 dark:text-white">
          {isEditing ? "Edit Monitor Settings" : "Add New Monitor"}
        </h1>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {isEditing
            ? "Update destination URL and health check parameters."
            : "Configure an endpoint for automated uptime tracking."}
        </p>

        {guestLimitReached && (
          <div className="mt-4 p-4 bg-neutral-900 dark:bg-neutral-950 text-white rounded-2xl text-xs space-y-2 border border-neutral-800">
            <div className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-400" />
              Guest Limit Reached (Max 2 Sites)
            </div>
            <p className="text-neutral-400 leading-relaxed">
              Guest accounts can monitor at most 2 sites. To add unlimited monitors, please create or upgrade your account.
            </p>
            <Link
              to="/register"
              className="inline-block mt-2 px-4 py-2 bg-white text-neutral-900 rounded-full text-xs font-semibold hover:bg-neutral-100 transition-colors"
            >
              Register Account Now &rarr;
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Monitor Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shop API or Production App"
              className="w-full h-11 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              URL (HTTP / HTTPS)
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:4100/svc/shop-api or https://example.com"
              className="w-full h-11 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-xs text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 transition-colors"
            />
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1.5 px-1">
              Protected by SSRF safeguards. In development, demo simulator is available at localhost:4100.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
              Check Interval (Seconds)
            </label>
            <GlideSelect
              options={intervalOptions}
              value={checkIntervalSeconds}
              onChange={(val) => setCheckIntervalSeconds(Number(val))}
              ariaLabel="Check interval"
              showTags
              accentColor={isDark ? "#f5f5f5" : "#18181b"}
              surfaceColor={isDark ? "#27272a" : "#ffffff"}
              highlightColor={isDark ? "#3f3f46" : "#f4f4f5"}
              textColor={isDark ? "#f5f5f5" : "#18181b"}
              size="lg"
              radius={16}
              menuWidth="100%"
              className="w-full"
              placement="bottom"
              align="left"
              popDuration={180}
              glideDuration={220}
              rememberPosition
              disabled={saving}
            />
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-neutral-100 dark:border-neutral-800">
            <Link
              to={isEditing ? `/monitors/${id}` : "/monitors"}
              className="px-5 py-2.5 text-xs font-medium text-neutral-600 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-full transition-colors"
            >
              Cancel
            </Link>
            <FlairButton
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-full border border-neutral-900 dark:border-white text-xs font-medium shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Monitor"}
            </FlairButton>
          </div>
        </form>
      </div>
    </div>
  );
}
