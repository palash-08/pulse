import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, KeyRound, Trash2, Sparkles, ShieldCheck, Radio, Settings } from "lucide-react";
import { useAuth } from "../auth/AuthContext.js";
import { updateAccount, changePassword, deleteAccount } from "../api/account.js";
import { ConfirmDialog } from "../components/ui/ConfirmDialog.js";
import { FlairButton } from "../components/ui/FlairButton.js";
import { DiscordAlertsSection } from "../components/alerts/DiscordAlertsSection.js";

export function AccountPage() {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "alerts" ? "alerts" : "profile";

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
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
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
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      setPassError(err.message || "Failed to change password.");
    } finally {
      setChangingPass(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteAccount({ password: user?.isGuest ? undefined : deletePass });
      await logout();
      navigate("/login");
    } catch (err: any) {
      setDeleteError(err.message || "Account deletion failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-neutral-900 dark:text-white tracking-tight transition-colors">
            Account & Settings
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage credentials, security preferences, and Discord alert webhooks
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-full text-xs font-medium self-start sm:self-auto transition-colors">
          <button
            onClick={() => setSearchParams({ tab: "profile" })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
              activeTab === "profile"
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Profile & Security
          </button>
          <button
            onClick={() => setSearchParams({ tab: "alerts" })}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all ${
              activeTab === "alerts"
                ? "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 shadow-xs"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            Discord Alerts
          </button>
        </div>
      </div>

      {user?.isGuest && (
        <div className="bg-neutral-900 dark:bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white text-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-neutral-100">
            <Sparkles className="w-5 h-5 text-neutral-400" />
            Temporary Guest Account
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            You are using Pulse in guest mode. Guest sessions expire after 7 days and allow monitoring up to 2 endpoints.
            Upgrade to a permanent registered account to save your monitors and alert webhooks indefinitely.
          </p>
          <div className="pt-1">
            <FlairButton
              as={Link}
              to="/register"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-neutral-900 dark:border-white text-xs font-semibold shadow-sm transition-all active:scale-[0.99]"
            >
              Upgrade & Keep Existing Monitors &rarr;
            </FlairButton>
          </div>
        </div>
      )}

      {/* Tab: Discord Alerts */}
      {activeTab === "alerts" && (
        user?.isGuest ? (
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-indigo-200/80 dark:border-indigo-900/60 p-6 sm:p-8 space-y-3 transition-colors shadow-xs">
            <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 dark:text-white text-lg">
              <Radio className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
              Discord Alerts Require a Registered Account
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Guest sessions are temporary and cannot manage webhooks after logout. Create a free account to enable Discord alerts — your monitors will transfer automatically.
            </p>
            <div className="pt-1">
              <FlairButton
                as={Link}
                to="/register"
                fill="#6366f1"
                textFrom="#6366f1"
                textTo="#ffffff"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-indigo-500/80 dark:border-indigo-500/80 bg-indigo-50/50 dark:bg-indigo-950/30 text-xs font-medium shadow-sm transition-all active:scale-[0.99]"
              >
                Register to Enable Alerts &rarr;
              </FlairButton>
            </div>
          </div>
        ) : (
          <DiscordAlertsSection />
        )
      )}

      {/* Tab: Profile & Security */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Profile Section */}
          {!user?.isGuest && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 sm:p-8 space-y-4 transition-colors">
              <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 dark:text-white text-lg">
                <User className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                Profile Information
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full h-11 px-4 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-full text-xs text-neutral-500 dark:text-neutral-400 cursor-not-allowed"
                  />
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1 block px-1">Email cannot be changed after registration.</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Display Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full h-11 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-xs text-neutral-900 dark:text-white transition-colors"
                  />
                </div>

                {profileSuccess && (
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Profile updated successfully!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium rounded-full text-xs shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {savingProfile ? "Saving..." : "Save Profile"}
                </button>
              </form>
            </div>
          )}

          {/* Change Password Section */}
          {!user?.isGuest && (
            <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 sm:p-8 space-y-4 transition-colors">
              <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 dark:text-white text-lg">
                <KeyRound className="w-5 h-5 text-neutral-400 dark:text-neutral-500" />
                Security & Password
              </div>

              {passError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 text-xs rounded-2xl">
                  {passError}
                </div>
              )}

              {passSuccess && (
                <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Password changed successfully!
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-xs text-neutral-900 dark:text-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={10}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 10 characters"
                    className="w-full h-11 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-600 focus:border-neutral-900 dark:focus:border-neutral-100 focus:outline-none text-xs text-neutral-900 dark:text-white transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-5 py-2.5 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-200 text-white dark:text-neutral-900 font-medium rounded-full text-xs shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {changingPass ? "Updating Password..." : "Change Password"}
                </button>
              </form>
            </div>
          )}

          {/* Danger Zone: Delete Account */}
          <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-rose-200 dark:border-rose-900/60 p-6 sm:p-8 space-y-3 transition-colors">
            <div className="flex items-center gap-2 font-serif font-bold text-rose-900 dark:text-rose-400 text-lg">
              <Trash2 className="w-5 h-5 text-rose-600" />
              Danger Zone
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
              Permanently delete your account and all associated monitors, health checks, incident logs, problem reports, and Discord alert webhooks.
              This action cannot be undone.
            </p>
            <FlairButton
              onClick={() => setShowDeleteModal(true)}
              fill="#dc2626"
              textFrom="#dc2626"
              textTo="#ffffff"
              className="mt-2 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full border border-rose-600/80 dark:border-rose-500/80 bg-rose-50/50 dark:bg-rose-950/30 text-xs font-medium shadow-sm transition-all active:scale-[0.99]"
            >
              Delete Account
            </FlairButton>
          </div>
        </div>
      )}

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
            <label className="block text-[11px] font-medium text-neutral-700 dark:text-neutral-300">Account Password</label>
            <input
              type="password"
              placeholder="Enter your current password"
              value={deletePass}
              onChange={(e) => setDeletePass(e.target.value)}
              className="w-full h-10 px-4 rounded-full border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-xs text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
            />
            {deleteError && (
              <p className="text-xs text-rose-600 dark:text-rose-400 px-1">{deleteError}</p>
            )}
          </div>
        )}
      </ConfirmDialog>
    </div>
  );
}
