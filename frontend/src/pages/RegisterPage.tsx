import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../auth/AuthContext.js";
import { ApiClientError } from "../api/client.js";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    setLoading(true);
    try {
      await register(email, password, displayName);
      navigate("/");
    } catch (err: any) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
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
              {user?.isGuest ? "Upgrade your account" : "Create your account"}
            </p>
            <p className="text-base text-neutral-600">
              {user?.isGuest
                ? "Keep all your monitors, history, and metrics safe."
                : "A new kind of system for getting things done."}
            </p>
          </div>
        </div>

        {user?.isGuest && (
          <div className="p-3.5 bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs rounded-2xl flex items-center justify-center gap-2 font-medium text-center">
            <Sparkles className="w-4 h-4 text-neutral-600 flex-shrink-0" />
            <span>Upgrading Guest session: Your existing monitors and history will be automatically preserved!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <input
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display name (e.g. Jane Doe)"
              className="w-full h-12 px-6 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors text-center"
            />
          </div>

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
              minLength={10}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (minimum 10 characters)"
              className="w-full h-12 px-6 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors text-center"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 rounded-full text-sm font-medium transition-all shadow-sm active:scale-[0.99] ${
              email && password && displayName
                ? "bg-neutral-900 hover:bg-black text-white"
                : "bg-[#9e9e9e] text-white hover:bg-neutral-600"
            } disabled:opacity-50`}
          >
            {loading ? "Creating account..." : user?.isGuest ? "Upgrade Account" : "Continue"}
          </button>
        </form>

        {/* Links & Disclaimer */}
        <div className="space-y-4 pt-2 text-center">
          <div className="text-xs text-neutral-600">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-neutral-900 hover:underline inline-flex items-center gap-1"
            >
              Sign in
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

