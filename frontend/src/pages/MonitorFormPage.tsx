import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { GlassButton } from "glaceui";
import { GlassCard } from "../components/ui/GlassCard.js";
import { createMonitor, getMonitor, updateMonitor } from "../api/monitors.js";
import { ApiClientError } from "../api/client.js";
import { Spinner } from "../components/ui/Spinner.js";

export function MonitorFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

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
        className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {isEditing ? "Monitor Details" : "Monitors"}
      </Link>

      <GlassCard tone="dark" className="p-6 sm:p-8 border border-white/10 rounded-3xl">
        <h1 className="text-2xl font-serif font-bold text-white">
          {isEditing ? "Edit Monitor Settings" : "Add New Monitor"}
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {isEditing
            ? "Update destination URL and health check parameters."
            : "Configure an endpoint for automated uptime tracking."}
        </p>

        {guestLimitReached && (
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-200 rounded-2xl text-xs space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Guest Limit Reached (Max 2 Sites)
            </div>
            <p className="text-zinc-300 leading-relaxed">
              Guest accounts can monitor at most 2 sites. To add unlimited monitors, please create or upgrade your account.
            </p>
            <Link
              to="/register"
              className="inline-block mt-2 px-4 py-2 bg-white/15 border border-white/20 text-white rounded-full text-xs font-semibold hover:bg-white/25 transition-colors"
            >
              Register Account Now &rarr;
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Monitor Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shop API or Production App"
              className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              URL (HTTP / HTTPS)
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:4100/svc/shop-api or https://example.com"
              className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
            />
            <p className="text-[11px] text-zinc-500 mt-1.5 px-1">
              Protected by SSRF safeguards. In development, demo simulator is available at localhost:4100.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Check Interval (Seconds)
            </label>
            <select
              value={checkIntervalSeconds}
              onChange={(e) => setCheckIntervalSeconds(Number(e.target.value))}
              className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 transition-colors cursor-pointer"
            >
              <option value={30} className="bg-zinc-900 text-zinc-100">Every 30 seconds</option>
              <option value={60} className="bg-zinc-900 text-zinc-100">Every 1 minute (Recommended)</option>
              <option value={120} className="bg-zinc-900 text-zinc-100">Every 2 minutes</option>
              <option value={300} className="bg-zinc-900 text-zinc-100">Every 5 minutes</option>
              <option value={600} className="bg-zinc-900 text-zinc-100">Every 10 minutes</option>
              <option value={1800} className="bg-zinc-900 text-zinc-100">Every 30 minutes</option>
              <option value={3600} className="bg-zinc-900 text-zinc-100">Every 1 hour</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/10">
            <Link
              to={isEditing ? `/monitors/${id}` : "/monitors"}
              className="px-5 py-2.5 text-xs font-medium text-zinc-400 bg-white/5 hover:bg-white/10 hover:text-white border border-white/10 rounded-full transition-colors"
            >
              Cancel
            </Link>
            <GlassButton
              tone="dark"
              size="md"
              type="submit"
              disabled={saving}
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Monitor"}
            </GlassButton>
          </div>
        </form>
      </GlassCard>
    </div>
  );
}
