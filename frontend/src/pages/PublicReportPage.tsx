import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { GlassCard, GlassButton, toast } from "glaceui";
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
      toast.error("Please provide a description of at least 10 characters.");
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
      toast.success("Problem report submitted successfully");
    } catch (err: any) {
      toast.error(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="min-h-screen bg-[#08080a] flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <ErrorState message={error || "Invalid problem report link"} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-[#08080a] flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #27272a 1px, transparent 0)`,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="max-w-md w-full mx-auto space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl sm:text-6xl font-serif tracking-tight text-white font-bold select-none drop-shadow-md">
            pulse
          </h1>
          <div className="space-y-1 pt-1">
            <p className="text-lg sm:text-xl text-zinc-100 font-medium tracking-tight">
              Report a Problem
            </p>
            <p className="text-sm text-zinc-400">
              Submit feedback directly to the service owner.
            </p>
          </div>
        </div>

        {/* Target Monitor Status Card */}
        <GlassCard tone="dark" className="p-6 sm:p-8 border border-white/10 rounded-3xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div>
              <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-semibold">Service Name</div>
              <div className="text-base font-semibold text-white">{info.monitorName}</div>
            </div>
            <div>
              <StatusBadge status={info.status} size="md" />
            </div>
          </div>

          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-white">Thank you for your report!</h2>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
                  Your feedback has been delivered to the service owner. We appreciate you taking the time to notify us.
                </p>
              </div>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setDescription("");
                }}
                className="mt-2 text-xs font-semibold text-zinc-300 hover:text-white hover:underline transition-colors"
              >
                Submit another report
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 transition-colors cursor-pointer"
                >
                  <option value="down" className="bg-zinc-900 text-zinc-100">Site / API is Down (Cannot reach)</option>
                  <option value="slow" className="bg-zinc-900 text-zinc-100">Service is Extremely Slow</option>
                  <option value="error" className="bg-zinc-900 text-zinc-100">Receiving Error Code (500, 502, 503)</option>
                  <option value="other" className="bg-zinc-900 text-zinc-100">Other Technical Problem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Description of Problem *
                </label>
                <textarea
                  required
                  rows={4}
                  minLength={10}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe what you observed (error message, page URL, device)..."
                  className="w-full p-4 rounded-2xl bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Your Email (Optional, if you wish to be notified)
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="contact@yourdomain.com"
                  className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder:text-zinc-500 transition-colors"
                />
              </div>

              {/* Honeypot field (hidden from real users, tricks spambots) */}
              <div className="hidden" aria-hidden="true">
                <label>Website</label>
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypotWebsite}
                  onChange={(e) => setHoneypotWebsite(e.target.value)}
                />
              </div>

              <GlassButton
                type="submit"
                tone="dark"
                size="md"
                disabled={submitting}
                className="w-full justify-center h-11 mt-2"
              >
                {submitting ? "Submitting Report..." : "Submit Problem Report"}
              </GlassButton>
            </form>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
