/**
 * Profile View Component (HTTP API Migrated)
 *
 * Features:
 * - View and edit user profile information
 * - Change password with validation
 * - Profile completeness indicator
 * - Real-time validation
 * - Success/error notifications
 *
 * Migration Status: ✅ Migrated from Electron IPC to HTTP REST API
 * Backend: backend/routes/profile.py
 * API Client: src/lib/apiClient.ts (profile namespace)
 */

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  User,
  Mail,
  Phone,
  Save,
  AlertCircle,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  Shield,
  TrendingUp,
} from "lucide-react";
import { Card } from "../components/ui/Card.tsx";
import { Button } from "../components/ui/Button.tsx";
import { Badge } from "../components/ui/Badge.tsx";
import { apiClient } from "../lib/apiClient.ts";
import type {
  ProfileResponse,
  ProfileCompletenessResponse,
} from "../lib/types/api.ts";

export function ProfileViewMigrated() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [completeness, setCompleteness] =
    useState<ProfileCompletenessResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Password change modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordChanging, setPasswordChanging] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
    loadCompleteness();
  }, []);

  // Track changes
  useEffect(() => {
    if (profile) {
      const nameChanged =
        firstName !== (profile.firstName || "") ||
        lastName !== (profile.lastName || "");
      const emailChanged = email !== (profile.email || "");
      const phoneChanged = phone !== (profile.phone || "");
      setHasChanges(nameChanged || emailChanged || phoneChanged);
    }
  }, [firstName, lastName, email, phone, profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const response = await apiClient.profile.get();

      if (response.success && response.data) {
        setProfile(response.data);
        setFirstName(response.data.firstName || "");
        setLastName(response.data.lastName || "");
        setEmail(response.data.email || "");
        setPhone(response.data.phone || "");
      } else {
        setError("Failed to load profile");
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadCompleteness = async () => {
    try {
      const response = await apiClient.profile.getCompleteness();
      if (response.success && response.data) {
        setCompleteness(response.data);
      }
    } catch (err) {
      console.error("Failed to load profile completeness:", err);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      // Validate inputs
      if (!firstName.trim()) {
        setError("First name is required");
        return;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Invalid email format");
        return;
      }

      if (phone && !/^[\d\s\-+()]+$/.test(phone)) {
        setError("Invalid phone format");
        return;
      }

      // Update profile
      const response = await apiClient.profile.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (response.success && response.data) {
        setProfile(response.data);
        setHasChanges(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);

        // Reload completeness
        loadCompleteness();
      } else {
        setError("Failed to update profile");
      }
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setError(err?.message || "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setPasswordChanging(true);
      setError(null);

      // Validate passwords
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match");
        return;
      }

      if (newPassword.length < 12) {
        setError("Password must be at least 12 characters");
        return;
      }

      // Change password
      const response = await apiClient.profile.changePassword({
        currentPassword,
        newPassword,
      });

      if (response.success) {
        // Success - close modal and show message
        setShowPasswordModal(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 5000);
        alert("Password changed successfully! Please log in again.");
        // Note: In production, you'd redirect to login page here
      } else {
        setError("Failed to change password");
      }
    } catch (err: any) {
      console.error("Failed to change password:", err);
      setError(err?.message || "Failed to change password. Please try again.");
    } finally {
      setPasswordChanging(false);
    }
  };

  const getCompletenessColor = () => {
    if (!completeness) {
      return "bg-gray-500";
    }
    if (completeness.percentage >= 80) {
      return "bg-green-500";
    }
    if (completeness.percentage >= 50) {
      return "bg-yellow-500";
    }
    return "bg-red-500";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-900 via-primary-900 to-gray-900">
      <div className="max-w-4xl mx-auto px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Profile</h1>
            <p className="text-white/60 mt-1">
              Manage your personal information
            </p>
          </div>

          {/* Profile Completeness Badge */}
          {completeness && (
            <div className="flex items-center gap-2">
              <Badge
                variant={completeness.percentage >= 80 ? "success" : "warning"}
                className="text-sm"
              >
                <TrendingUp className="w-4 h-4 mr-1" />
                {completeness.percentage}% Complete
              </Badge>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Success Alert */}
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
            <p className="text-green-400">Profile updated successfully!</p>
          </motion.div>
        )}

        {/* Profile Completeness Card */}
        {completeness && completeness.percentage < 100 && (
          <Card className="bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-500/20">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Complete Your Profile
              </h3>
              <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                <div
                  className={`${getCompletenessColor()} h-2 rounded-full transition-all w-full`}
                />
              </div>
              {completeness.missingFields.length > 0 && (
                <p className="text-sm text-white/60">
                  Missing: {completeness.missingFields.join(", ")}
                </p>
              )}
            </div>
          </Card>
        )}

        {/* Profile Form */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <div className="p-6 space-y-6">
            <h3 className="text-lg font-semibold text-white">
              Personal Information
            </h3>

            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="first-name"
                  className="block text-sm font-medium text-white mb-2"
                >
                  First Name *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    id="first-name"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="John"
                    required
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="last-name"
                  className="block text-sm font-medium text-white mb-2"
                >
                  Last Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-white/40" />
                  </div>
                  <input
                    id="last-name"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Doe"
                  />
                </div>
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="your.email@example.com"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Used for notifications and data exports
              </p>
            </div>

            {/* Phone Field */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-white mb-2"
              >
                Phone Number (Optional)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="+44 7700 900000"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">
                Your contact number for urgent case updates
              </p>
            </div>

            {/* Last Updated */}
            {profile && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-white/40">
                  Last updated: {new Date(profile.updatedAt).toLocaleString()}
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4 pt-4">
              <Button
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className={`
                  ${
                    hasChanges
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                      : "bg-white/10 cursor-not-allowed"
                  } text-white transition-all
                `}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {hasChanges ? "Save Changes" : "No Changes"}
                  </>
                )}
              </Button>

              {hasChanges && !saving && (
                <span className="text-sm text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  You have unsaved changes
                </span>
              )}

              {!hasChanges && profile && (
                <span className="text-sm text-green-400 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Profile saved
                </span>
              )}
            </div>
          </div>
        </Card>

        {/* Security Card */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-6 h-6 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Security</h3>
            </div>

            <p className="text-white/60 text-sm mb-4">
              Keep your account secure by using a strong, unique password.
            </p>

            <Button
              onClick={() => setShowPasswordModal(true)}
              variant="secondary"
              className="border-white/20 text-white hover:bg-white/5"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </Button>
          </div>
        </Card>

        {/* Privacy Notice */}
        <Card className="bg-white/5 border-white/10 backdrop-blur-md">
          <div className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-white font-medium mb-1">Privacy Notice</h4>
                <p className="text-sm text-white/60">
                  Your profile information is encrypted and stored securely. It
                  is used to personalize your experience and populate legal
                  documents.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-900 rounded-lg border border-white/10 max-w-md w-full p-6"
          >
            <h3 className="text-xl font-bold text-white mb-4">
              Change Password
            </h3>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter new password (min 12 chars)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500"
                  placeholder="Confirm new password"
                />
              </div>

              {/* Password Requirements */}
              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                <p className="text-xs text-white/60 mb-2">
                  Password must contain:
                </p>
                <ul className="text-xs text-white/60 space-y-1">
                  <li>• At least 12 characters</li>
                  <li>• One uppercase letter</li>
                  <li>• One lowercase letter</li>
                  <li>• One number</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                onClick={handleChangePassword}
                disabled={
                  passwordChanging ||
                  !currentPassword ||
                  !newPassword ||
                  !confirmPassword
                }
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                {passwordChanging ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Changing...
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Change Password
                  </>
                )}
              </Button>
              <Button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setError(null);
                }}
                variant="secondary"
                className="border-white/20 text-white hover:bg-white/5"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
