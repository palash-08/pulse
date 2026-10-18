import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, KeyRound, Trash2, Sparkles, ShieldCheck } from "lucide-react";
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
      await deleteAccount({ password: user?.isGuest ? undefined : deletePass });
      await logout();
      navigate("/login");
    } catch (err: any) {
      alert(`Account deletion failed: ${err.message}`);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-neutral-900 tracking-tight">Account Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your credentials, profile, and security preferences</p>
      </div>

      {user?.isGuest && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 text-white text-sm space-y-3">
          <div className="flex items-center gap-2 font-bold text-base text-neutral-100">
            <Sparkles className="w-5 h-5 text-neutral-400" />
            Temporary Guest Account
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            You are using Pulse in guest mode. Guest sessions expire after 7 days and allow monitoring up to 2 endpoints.
            Upgrade to a permanent registered account to save your monitors indefinitely.
          </p>
          <div className="pt-1">
            <Link
              to="/register"
              className="inline-block px-5 py-2.5 bg-white text-neutral-900 rounded-full text-xs font-semibold hover:bg-neutral-100 transition-colors shadow-sm"
            >
              Upgrade & Keep Existing Monitors &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Profile Section */}
      {!user?.isGuest && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 text-lg">
            <User className="w-5 h-5 text-neutral-400" />
            Profile Information
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Email Address</label>
              <input
                type="email"
                disabled
                value={user?.email || ""}
                className="w-full h-11 px-4 bg-neutral-100 border border-neutral-200 rounded-full text-xs text-neutral-500 cursor-not-allowed"
              />
              <span className="text-[11px] text-neutral-400 mt-1 block px-1">Email cannot be changed after registration.</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-11 px-4 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 transition-colors"
              />
            </div>

            {profileSuccess && (
              <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" /> Profile updated successfully!
              </div>
            )}

            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-medium rounded-full text-xs shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {savingProfile ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      )}

      {/* Change Password Section */}
      {!user?.isGuest && (
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 text-lg">
            <KeyRound className="w-5 h-5 text-neutral-400" />
            Security & Password
          </div>

          {passError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl">
              {passError}
            </div>
          )}

          {passSuccess && (
            <div className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Password changed successfully!
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-11 px-4 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1.5">New Password</label>
              <input
                type="password"
                required
                minLength={10}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 10 characters"
                className="w-full h-11 px-4 rounded-full border border-neutral-200 hover:border-neutral-300 focus:border-neutral-900 focus:outline-none text-xs text-neutral-900 transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={changingPass}
              className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white font-medium rounded-full text-xs shadow-sm active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {changingPass ? "Updating Password..." : "Change Password"}
            </button>
          </form>
        </div>
      )}

      {/* Danger Zone: Delete Account */}
      <div className="bg-white rounded-3xl border border-rose-200 p-6 sm:p-8 space-y-3">
        <div className="flex items-center gap-2 font-serif font-bold text-rose-900 text-lg">
          <Trash2 className="w-5 h-5 text-rose-600" />
          Danger Zone
        </div>
        <p className="text-xs text-rose-700 leading-relaxed">
          Permanently delete your account and all associated monitors, health checks, incident logs, and problem reports.
          This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="mt-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-full text-xs shadow-sm transition-colors active:scale-[0.99]"
        >
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteModal}
        title="Delete Your Account"
        message={
          user?.isGuest
            ? "Are you sure you want to end this guest session and delete all data?"
            : "Please confirm account deletion. All your monitors and history will be permanently deleted."
        }
        confirmLabel="Confirm Delete"
        isDestructive={true}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
