import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserCheck, Sparkles } from "lucide-react";
import { GlassCard, GlassButton } from "glaceui";
import { useAuth } from "../auth/AuthContext.js";
import { ApiClientError } from "../api/client.js";

export function LoginPage() {
  const { login, guest } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setError(null);
    setGuestLoading(true);
    try {
      await guest();
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to start guest session.");
    } finally {
      setGuestLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail("demo@pulse.test");
    setPassword("password123!");
  };

  return (
    <div
      className="min-h-screen bg-[#08080a] flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden"
      style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #27272a 1px, transparent 0)`,
        backgroundSize: "24px 24px",
      }}
    >
      <div className="w-full max-w-md mx-auto space-y-8 relative z-10">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl sm:text-6xl font-serif tracking-tight text-white font-bold select-none drop-shadow-md">
            pulse
          </h1>

          <div className="space-y-1">
            <p className="text-lg sm:text-xl text-zinc-100 font-medium tracking-tight">
              Sign in to Pulse
            </p>
            <p className="text-sm text-zinc-400">
              The heartbeat of your infrastructure
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        <GlassCard tone="dark" className="p-7 sm:p-8 border border-white/10 rounded-3xl space-y-6">
          {/* Quick Action Buttons */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGuest}
              disabled={guestLoading}
              className="w-full h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4 text-zinc-400" />
              <span>{guestLoading ? "Starting Guest Session..." : "Continue as Guest"}</span>
            </button>

            <button
              type="button"
              onClick={handleQuickDemo}
              className="w-full h-12 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.99]"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Fill Demo Credentials (demo@pulse.test)</span>
            </button>
          </div>

          {/* Minimalist Divider */}
          <div className="relative my-2 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <span className="relative bg-[#0e0e12] px-4 text-xs text-zinc-500 uppercase tracking-widest font-mono">
              or
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full h-12 px-6 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors text-center"
              />
            </div>

            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full h-12 px-6 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors text-center"
              />
            </div>

            <GlassButton
              type="submit"
              tone="dark"
              size="lg"
              disabled={loading}
              className="w-full justify-center h-12"
            >
              {loading ? "Signing in..." : "Continue with Email"}
            </GlassButton>
          </form>

          {/* Registration Redirect */}
          <div className="pt-2 text-center border-t border-white/10">
            <div className="text-xs text-zinc-400">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-semibold text-zinc-200 hover:text-white hover:underline inline-flex items-center gap-1"
              >
                Sign up
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
