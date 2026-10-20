import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, KeyRound, Trash2, Sparkles, ShieldCheck } from "lucide-react";
import { GlassCard, GlassButton, toast } from "glaceui";
import { useAuth } from "../auth/AuthContext.js";
import { updateAccount, changePassword, deleteAccount } from "../api/account.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";

export function AccountPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile update
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passSuccess, setPassSuccess] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Account deletion
  const [deletePass, setDeletePass] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileSuccess(false);
    try {
      await updateAccount({ displayName });
      await refreshUser();
      setProfileSuccess(true);
      toast.success("Profile updated successfully");
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      toast.error(`Update failed: ${err.message}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    setPassError(null);
    setPassSuccess(false);
    try {
      await changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setPassSuccess(true);
      toast.success("Password changed successfully");
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      setPassError(err.message || "Failed to change password.");
      toast.error(err.message || "Failed to change password.");
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteAccount({ password: user?.isGuest ? undefined : deletePass });
      toast.success("Account deleted");
      await logout();
      navigate("/login");
    } catch (err: any) {
      setDeleteError(err.message || "Account deletion failed");
      toast.error(err.message || "Account deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-white tracking-tight">Account Settings</h1>
        <p className="text-sm text-zinc-400 mt-1">Manage your credentials, profile, and security preferences</p>
      </div>

      {user?.isGuest && (
        <GlassCard tone="dark" className="border border-white/10 rounded-3xl p-6 text-white space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-zinc-100">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Temporary Guest Account
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            You are using Pulse in guest mode. Guest sessions expire after 7 days and allow monitoring up to 2 endpoints.
            Upgrade to a permanent registered account to save your monitors indefinitely.
          </p>
          <div className="pt-1">
            <Link to="/register">
              <GlassButton tone="dark" size="sm">
                Upgrade & Keep Existing Monitors &rarr;
              </GlassButton>
            </Link>
          </div>
        </GlassCard>
      )}

      {/* Profile Section */}
      {!user?.isGuest && (
        <GlassCard tone="dark" className="rounded-3xl border border-white/10 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 font-serif font-bold text-white text-lg">
            <User className="w-5 h-5 text-zinc-400" />
            Profile Information
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full h-11 px-4 bg-zinc-900/40 border border-white/5 rounded-full text-xs text-zinc-500 cursor-not-allowed select-none"
              />
              <span className="text-[11px] text-zinc-500 mt-1 block px-1">Email cannot be changed after registration.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
              />
            </div>

            {profileSuccess && (
              <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Profile updated successfully!
              </div>
            )}

            <GlassButton
              type="submit"
              tone="dark"
              size="md"
              disabled={savingProfile}
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </GlassButton>
          </form>
        </GlassCard>
      )}

      {/* Change Password Section */}
      {!user?.isGuest && (
        <GlassCard tone="dark" className="rounded-3xl border border-white/10 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 font-serif font-bold text-white text-lg">
            <KeyRound className="w-5 h-5 text-zinc-400" />
            Security & Password
          </div>

          {passError && (
            <div className="p-3.5 bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs rounded-2xl">
              {passError}
            </div>
          )}

          {passSuccess && (
            <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Password changed successfully!
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 10 characters"
                className="w-full h-11 px-4 rounded-full bg-zinc-900/60 border border-white/10 hover:border-white/20 focus:border-white/30 focus:outline-none text-xs text-zinc-100 placeholder-zinc-500 transition-colors"
              />
            </div>

            <GlassButton
              type="submit"
              tone="dark"
              size="md"
              disabled={changingPass}
            >
              {changingPass ? "Updating Password..." : "Change Password"}
            </GlassButton>
          </form>
        </GlassCard>
      )}

      {/* Danger Zone: Delete Account */}
      <GlassCard tone="dark" className="rounded-3xl border border-rose-500/20 p-6 sm:p-8 space-y-3 bg-rose-950/10">
        <div className="flex items-center gap-2 font-serif font-bold text-rose-300 text-lg">
          <Trash2 className="w-5 h-5 text-rose-400" />
          Danger Zone
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">
          Permanently delete your account and all associated monitors, health checks, incident logs, and problem reports.
          This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-2 px-5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-medium rounded-full text-xs shadow-sm transition-colors active:scale-[0.99]"
        >
          Delete Account
        </button>
      </GlassCard>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Your Account"
        message={
          user?.isGuest
            ? "Are you sure you want to end this guest session and delete all data?"
            : "Please enter your password to confirm account deletion. All your monitors and history will be permanently deleted."
        }
        confirmLabel={deleting ? "Deleting..." : "Confirm Delete"}
        isDestructive={true}
        disabled={deleting || (!user?.isGuest && !deletePass)}
        onConfirm={handleDeleteAccount}
        onCancel={() => {
          setShowDeleteModal(false);
          setDeletePass("");
          setDeleteError(null);
        }}
      >
        {!user?.isGuest && (
          <div className="space-y-2 pt-1">
            <label className="block text-[11px] font-medium text-zinc-300">Account Password</label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={deletePass}
              onChange={(e) => setDeletePass(e.target.value)}
              className="w-full h-10 px-4 rounded-full bg-zinc-900/60 border border-white/10 text-xs text-zinc-100 focus:outline-none focus:border-white/30"
            />
            {deleteError && (
              <p className="text-xs text-rose-400 px-1">{deleteError}</p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
