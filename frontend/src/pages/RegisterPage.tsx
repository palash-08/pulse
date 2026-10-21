import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { GlassButton } from "glaceui";
import { GlassCard } from "../components/ui/GlassCard.js";
import { useAuth } from "../auth/AuthContext.js";
import { ApiClientError } from "../api/client.js";

export function RegisterPage() {
  const { user, register } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
    <div
      className="min-h-screen bg-[#0b0b10] flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative overflow-hidden"
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
              {user?.isGuest ? "Upgrade your account" : "Create your account"}
            </p>
            <p className="text-sm text-zinc-400">
              {user?.isGuest
                ? "Keep all your monitors, history, and metrics safe"
                : "Start monitoring your services in seconds"}
            </p>
          </div>
        </div>

        {user?.isGuest && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs rounded-2xl flex items-center justify-center gap-2 font-medium text-center">
            <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>Upgrading Guest session: Your existing monitors and history will be automatically preserved!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        <GlassCard tone="dark" className="p-7 sm:p-8 border border-white/10 rounded-3xl space-y-5">
          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Display name (e.g. Jane Doe)"
                className="w-full h-12 px-6 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors text-center"
              />
            </div>

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

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (minimum 10 characters)"
                className="w-full h-12 px-12 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors text-center"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                minLength={10}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full h-12 px-12 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-sm text-zinc-100 placeholder:text-zinc-500 transition-colors text-center"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 transition-colors focus:outline-none p-1"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                title={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <GlassButton
              type="submit"
              tone="dark"
              size="lg"
              disabled={loading}
              className="w-full justify-center h-12"
            >
              {loading ? "Creating account..." : user?.isGuest ? "Upgrade Account" : "Create Account"}
            </GlassButton>
          </form>

          {/* Links */}
          <div className="pt-2 text-center border-t border-white/10">
            <div className="text-xs text-zinc-400">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-zinc-200 hover:text-white hover:underline inline-flex items-center gap-1"
              >
                Sign in
              </Link>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
