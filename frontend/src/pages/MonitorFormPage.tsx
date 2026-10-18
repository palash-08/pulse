import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
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

    try {
      if (isEditing && id) {
        await updateMonitor(Number(id), { name, url, checkIntervalSeconds });
        navigate(`/monitors/${id}`);
      } else {
        const res = await createMonitor({ name, url, checkIntervalSeconds });
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
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to {isEditing ? "Monitor Details" : "Monitors"}
      </Link>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
        <h1 className="text-xl font-bold text-slate-900">
          {isEditing ? "Edit Monitor Settings" : "Add New Monitor"}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {isEditing
            ? "Update destination URL and health check parameters."
            : "Configure an endpoint for automated uptime tracking."}
        </p>

        {guestLimitReached && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-sm space-y-2">
            <div className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              Guest Limit Reached (Max 2 Sites)
            </div>
            <p className="text-xs text-amber-800">
              Guest accounts can monitor at most 2 sites. To add unlimited monitors, please create or upgrade your account.
            </p>
            <Link
              to="/register"
              className="inline-block mt-2 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700"
            >
              Register Account Now &rarr;
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Monitor Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Shop API or Production App"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              URL (HTTP / HTTPS)
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="http://localhost:4100/svc/shop-api or https://example.com"
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Protected by SSRF safeguards. In development, demo simulator is available at localhost:4100.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Check Interval (Seconds)
            </label>
            <select
              value={checkIntervalSeconds}
              onChange={(e) => setCheckIntervalSeconds(Number(e.target.value))}
              className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 1 minute (Recommended)</option>
              <option value={120}>Every 2 minutes</option>
              <option value={300}>Every 5 minutes</option>
              <option value={600}>Every 10 minutes</option>
              <option value={1800}>Every 30 minutes</option>
              <option value={3600}>Every 1 hour</option>
            </select>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <Link
              to={isEditing ? `/monitors/${id}` : "/monitors"}
              className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : isEditing ? "Save Changes" : "Create Monitor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
