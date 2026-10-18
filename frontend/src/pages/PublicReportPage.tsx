import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState message={error || "Invalid problem report link"} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="max-w-md w-full mx-auto space-y-8">
        {/* Header in Editorial Serif */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl sm:text-6xl font-serif tracking-tight text-neutral-900 font-bold select-none">
            pulse
          </h1>
          <div className="space-y-1 pt-1">
            <p className="text-lg sm:text-xl text-neutral-900 font-medium tracking-tight">
              Report a Problem
            </p>
            <p className="text-sm text-neutral-600">
              Submit feedback directly to the service owner.
            </p>
          </div>
        </div>

        {/* Target Monitor Status Card */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider font-semibold">Service Name</div>
              <div className="text-base font-semibold text-neutral-900">{info.monitorName}</div>
            </div>
            <div>
              <StatusBadge status={info.status} size="md" />
            </div>
          </div>

          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-neutral-900">Thank you for your report!</h2>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto leading-relaxed">
                  Your feedback has been delivered to the service owner. We appreciate you taking the time to notify us.
                </p>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setDescription("");
                }}
                className="mt-2 text-xs font-semibold text-neutral-900 hover:underline"
              >
                Submit another report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-11 px-4 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 bg-white transition-colors"
                >
                  <option value="down">Site / API is Down (Cannot reach)</option>
                  <option value="slow">Service is Extremely Slow</option>
                  <option value="error">Receiving Error Code (500, 502, 503)</option>
                  <option value="other">Other Technical Problem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
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
                  className="w-full p-4 rounded-2xl border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 placeholder:text-neutral-400 transition-colors"
                />
                <div className="text-[10px] text-neutral-400 mt-1 flex justify-between px-1">
                  <span>Minimum 10 characters</span>
                  <span>{description.length} / 1000</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1.5">
                  Your Email (Optional)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Optional, in case the team needs more details"
                  className="w-full h-11 px-4 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 placeholder:text-neutral-400 transition-colors"
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
                className="w-full h-12 rounded-full bg-neutral-900 hover:bg-black text-white text-sm font-medium transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
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

