import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Sparkles, User, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../auth/AuthContext.js";
import { useTheme } from "../context/useTheme.js";
import { ApiClientError } from "../api/client.js";
import { ThemeToggle } from "../components/ui/ThemeToggle.js";
import { DotShader } from "../components/ui/dot-shader.js";
import { LockInput } from "@/components/ui/lock-input";

export function RegisterPage() {
  const { user, register } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
              {user?.isGuest ? "Upgrade your account" : "Create your account"}
            </p>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {user?.isGuest
                ? "Keep all your monitors, history, and metrics safe"
                : "Start monitoring your services in seconds"}
            </p>
          </div>
        </div>

        {user?.isGuest && (
          <div className="p-3.5 bg-neutral-100 dark:bg-neutral-950/60 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 text-xs rounded-2xl flex items-center justify-center gap-2 font-medium text-center">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
            <span>Upgrading Guest session: Your existing monitors and history will be automatically preserved!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs rounded-2xl text-center">
            {error}
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <LockInput
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (e.g. Jane Doe)"
            leftIcon={<User className="w-4 h-4" />}
          />

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
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (minimum 10 characters)"
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
              email && password && displayName
                ? "bg-neutral-900 text-white hover:bg-black dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                : "bg-neutral-200 text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
            } disabled:opacity-50`}
          >
            {loading ? "Creating account..." : user?.isGuest ? "Upgrade Account" : "Continue"}
          </button>
        </form>

        {/* Links */}
        <div className="pt-2 text-center">
          <div className="text-xs text-neutral-500 dark:text-neutral-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-neutral-900 dark:text-neutral-200 hover:underline inline-flex items-center gap-1"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </DotShader>
  );
}
