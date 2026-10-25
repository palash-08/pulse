import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserCheck, Sparkles, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext.js";
import { useTheme } from "../context/useTheme.js";
import { ApiClientError } from "../api/client.js";
import { ThemeToggle } from "../components/ui/ThemeToggle.js";
import { DotShader } from "../components/ui/dot-shader.js";
import { LockInput } from "@/components/ui/lock-input";

export function LoginPage() {
  const { login, guest } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
    <DotShader
      fixed
      className="min-h-screen w-full bg-[#fafafa] dark:bg-[#09090b] flex flex-col justify-center items-center px-4 sm:px-6 py-12 relative transition-colors duration-200"
      dotColor={isDark ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)"}
      accentColor={isDark ? "#ffffff" : "#0a0a0a"}
      spacing={24}
      dotSize={1.5}
      cursorRadius={200}
      distortionStrength={0.4}
      maxScale={2.5}
      overlay={false}
    >
      {/* Top Corner Dark/Light Mode Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md mx-auto space-y-8 relative z-10 p-8 sm:p-10 rounded-3xl bg-white/85 dark:bg-neutral-900/60 backdrop-blur-md border border-neutral-200/80 dark:border-neutral-800/80 shadow-2xl shadow-neutral-200/50 dark:shadow-black/60 transition-all">
        {/* Brand Logo & Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl sm:text-6xl font-serif tracking-tight text-neutral-900 dark:text-white font-bold select-none transition-colors">
            pulse
          </h1>

          <div className="space-y-1">
            <p className="text-lg sm:text-xl text-neutral-900 dark:text-neutral-100 font-medium tracking-tight">
              Sign in to Pulse
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              The heartbeat of your infrastructure
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Quick Action Pill Buttons */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGuest}
            disabled={guestLoading}
            className="w-full h-12 sm:h-13 rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700/80 dark:text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <UserCheck className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>{guestLoading ? "Starting Guest Session..." : "Continue as Guest"}</span>
          </button>

          <button
            type="button"
            onClick={handleQuickDemo}
            className="w-full h-12 sm:h-13 rounded-full bg-neutral-100 hover:bg-neutral-200 border border-neutral-200 text-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:border-neutral-700/80 dark:text-white text-sm font-medium flex items-center justify-center gap-2.5 transition-all shadow-xs active:scale-[0.99]"
          >
            <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
            <span>Fill Demo Credentials (demo@pulse.test)</span>
          </button>
        </div>

        {/* Subtle Minimalist Divider */}
        <div className="relative my-4 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-neutral-200 dark:border-neutral-800" />
          </div>
          <span className="relative bg-white/90 dark:bg-neutral-900/90 px-4 text-xs text-neutral-400 dark:text-neutral-500 uppercase tracking-widest font-normal">
            or
          </span>
        </div>

        {/* Email / Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <LockInput
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <LockInput
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            leftIcon={<Lock className="w-4 h-4" />}
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-neutral-400 hover:text-neutral-700 dark:hover:text-white transition-colors focus:outline-none p-1 cursor-pointer"
                tabIndex={-1}
                title={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            }
          />

          <button
            type="submit"
            disabled={loading}
            className={`w-full h-11 rounded-xl text-sm font-medium transition-all shadow-sm active:scale-[0.99] ${
              email && password
                ? "bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
            } disabled:opacity-50`}
          >
            {loading ? "Signing in..." : "Continue"}
          </button>
        </form>

        {/* Links */}
        <div className="pt-2 text-center">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-neutral-900 dark:text-neutral-200 hover:underline inline-flex items-center gap-1"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
    </DotShader>
  );
}
