import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Activity, CheckCircle2 } from "lucide-react";
import { getPublicReportInfo, submitPublicReport } from "../api/publicReport.js";
import { StatusBadge } from "../components/ui/StatusBadge.js";
import { Spinner } from "../components/ui/Spinner.js";
import { ErrorState } from "../components/ui/ErrorState.js";

export function PublicReportPage() {
  const { token } = useParams<{ token: string }>();

  const [info, setInfo] = useState<{ monitorName: string; status: "up" | "down" | "unknown" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [category, setCategory] = useState<"down" | "slow" | "error" | "other">("down");
  const [description, setDescription] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [honeypotWebsite, setHoneypotWebsite] = useState("");

  useEffect(() => {
    if (token) {
      getPublicReportInfo(token)
        .then((res) => setInfo(res))
        .catch((err) => setError(err.message || "This report link is invalid or disabled."))
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (description.trim().length < 10) {
      alert("Please provide a description of at least 10 characters.");
      return;
    }

    setSubmitting(true);
    try {
      await submitPublicReport(token, {
        category,
        description,
        contactEmail: contactEmail.trim() || undefined,
        website: honeypotWebsite,
      });
      setSubmitted(true);
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState message={error || "Invalid problem report link"} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-blue-600 items-center justify-center text-white shadow-md mb-3">
            <Activity className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Report a Problem</h1>
          <p className="text-sm text-slate-500 mt-1">Submit feedback directly to the service owner</p>
        </div>

        {/* Target Monitor Status Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="text-xs text-slate-400 uppercase font-semibold">Service Name</div>
              <div className="text-lg font-bold text-slate-900">{info.monitorName}</div>
            </div>
            <div>
              <StatusBadge status={info.status} size="md" />
            </div>
          </div>

          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
              <h2 className="text-lg font-bold text-slate-900">Thank you for your report!</h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Your feedback has been delivered to the service owner. We appreciate you taking the time to notify us.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setDescription("");
                }}
                className="mt-4 px-4 py-2 text-xs font-semibold text-blue-600 hover:underline"
              >
                Submit another report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="down">Site / API is Down (Cannot reach)</option>
                  <option value="slow">Service is Extremely Slow</option>
                  <option value="error">Receiving Error Code (500, 502, 503)</option>
                  <option value="other">Other Technical Problem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Description of Problem *
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={10}
                  maxLength={1000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what you observed (minimum 10 characters)..."
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-[11px] text-slate-400 mt-1 flex justify-between">
                  <span>Minimum 10 characters</span>
                  <span>{description.length} / 1000</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Your Email (Optional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Optional, in case the team needs more details"
                  className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Bot Honeypot field (hidden from real users via css) */}
              <div className="hidden" aria-hidden="true">
                <input
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypotWebsite}
                  onChange={(e) => setHoneypotWebsite(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm shadow-sm transition-colors disabled:opacity-50"
              >
                {submitting ? "Sending Report..." : "Submit Problem Report"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
