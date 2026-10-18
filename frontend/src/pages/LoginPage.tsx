import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserCheck, Sparkles } from "lucide-react";
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
    <div className="min-h-screen bg-white flex flex-col justify-center items-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-md mx-auto space-y-8">
        {/* Brand Logo & Header in Hark Pro Editorial Serif */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl sm:text-6xl font-serif tracking-tight text-neutral-900 font-bold select-none">
            pulse <span className="italic font-normal text-neutral-400">pro</span>
          </h1>

          <div className="space-y-1 pt-1">
            <p className="text-lg sm:text-xl text-neutral-900 font-medium tracking-tight">
              A new kind of system for getting things done.
            </p>
            <p className="text-base text-neutral-600">
              Whatever you need, let Pulse handle it.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Quick Action Pill Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full h-12 sm:h-13 rounded-full bg-[#18181b] hover:bg-black text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.99] disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4 text-neutral-400" />
            <span>{guestLoading ? "Starting Guest Session..." : "Continue as Guest"}</span>
          </button>

          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full h-12 sm:h-13 rounded-full bg-[#18181b] hover:bg-black text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-sm active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-neutral-400" />
            <span>Fill Demo Credentials (demo@pulse.test)</span>
          </button>
        </div>

        {/* Subtle Minimalist Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200" />
          </div>
          <span className="relative bg-white px-4 text-xs text-neutral-400 uppercase tracking-widest font-normal">
            or
          </span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full h-12 px-6 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors text-center"
            />
          </div>

          <div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-12 px-6 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 rounded-full text-sm font-medium transition-all shadow-sm active:scale-[0.99] ${
              email && password
                ? "bg-neutral-900 hover:bg-black text-white"
                : "bg-[#9e9e9e] text-white hover:bg-neutral-600"
            } disabled:opacity-50`}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        {/* Links & Disclaimer */}
        <div className="space-y-4 pt-2 text-center">
          <div className="text-xs text-neutral-600">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
            >
              Create account
            </Link>
          </div>

          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto leading-relaxed">
            By continuing, you agree to our{" "}
            <span className="font-semibold text-neutral-600">Terms of Service</span> and
            acknowledge that your data will be processed in accordance with our{" "}
            <span className="font-semibold text-neutral-600">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
