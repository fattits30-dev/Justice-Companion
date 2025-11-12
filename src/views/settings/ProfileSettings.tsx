import { useState, useEffect } from "react";
import { User, Mail, Save, AlertCircle, Check, Phone } from "lucide-react";
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { toast } from "sonner";
import { logger } from '../../utils/logger';
import type { IPCErrorResponse } from '../../types/window';

interface UserProfile {
  id: number;
  name: string;
  email: string | null;
  username?: string;
  phone?: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export function ProfileSettingsTab() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state - split name into first and last
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Load profile on mount
  useEffect(() => {
    loadProfile();
  }, []);

  // Track changes
  useEffect(() => {
    if (profile) {
      const fullName = `${firstName} ${lastName}`.trim();
      const usernameChanged = username !== (profile.username || "");
      const nameChanged = fullName !== profile.name;
      const emailChanged = email !== (profile.email || "");
      const phoneChanged = phone !== (profile.phone || "");
      setHasChanges(usernameChanged || nameChanged || emailChanged || phoneChanged);
    }
  }, [username, firstName, lastName, email, phone, profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        toast.error("No active session");
        return;
      }

      const response = await window.justiceAPI.getUserProfile(sessionId);
      if (response.success && response.data?.profile) {
        // Transform null values to undefined to match UserProfile interface
        const transformedProfile: UserProfile = {
          ...response.data.profile,
          username: response.data.profile.username ?? undefined,
          phone: response.data.profile.phone ?? undefined,
          email: response.data.profile.email
        };
        setProfile(transformedProfile);
        setUsername(response.data.profile.username || "");
        // Split name into first and last
        const nameParts = response.data.profile.name.split(" ");
        setFirstName(nameParts[0] || "");
        setLastName(nameParts.slice(1).join(" ") || "");
        setEmail(response.data.profile.email || "");
        setPhone(response.data.profile.phone || "");
      } else {
        toast.error("Failed to load profile");
      }
    } catch (error) {
      logger.error("Failed to load profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const sessionId = localStorage.getItem("sessionId");
      if (!sessionId) {
        toast.error("No active session");
        return;
      }

      // Validate inputs
      if (!firstName.trim()) {
        toast.error("First name is required");
        return;
      }

      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        toast.error("Invalid email format");
        return;
      }

      // Validate phone format if provided
      if (phone && !/^[\d\s\-+()]+$/.test(phone)) {
        toast.error("Invalid phone format");
        return;
      }

      // Save profile
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const response = await window.justiceAPI.updateUserProfile(sessionId, {
        username: username.trim() || null,
        name: fullName,
        email: email.trim() || null,
        phone: phone.trim() || null,
      });

      if (response.success && response.data?.profile) {
        // Transform null values to undefined to match UserProfile interface
        const transformedProfile: UserProfile = {
          ...response.data.profile,
          username: response.data.profile.username ?? undefined,
          phone: response.data.profile.phone ?? undefined,
          email: response.data.profile.email
        };
        setProfile(transformedProfile);
        setHasChanges(false);
        toast.success("Profile updated successfully!");
      } else {
        toast.error((response as IPCErrorResponse).error?.message || "Failed to update profile");
      }
    } catch (error) {
      logger.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Profile</h2>
        <p className="text-white/60">Manage your personal information</p>
      </div>

      {/* Profile Form */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6 space-y-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Personal Information
          </h3>

          {/* Username Field */}
          <div>
            <label
              htmlFor="profile-username"
              className="block text-sm font-medium text-white mb-2"
            >
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-white/40" />
              </div>
              <input
                id="profile-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="johndoe123"
              />
            </div>
            <p className="text-xs text-white/40 mt-1">
              Your display username (different from login username)
            </p>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label
                htmlFor="profile-first-name"
                className="block text-sm font-medium text-white mb-2"
              >
                First Name *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="profile-first-name"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="John"
                  required
                />
              </div>
            </div>

            {/* Last Name */}
            <div>
              <label
                htmlFor="profile-last-name"
                className="block text-sm font-medium text-white mb-2"
              >
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-white/40" />
                </div>
                <input
                  id="profile-last-name"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Doe"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-white/40 -mt-2">
            This name will be used in your legal documents
          </p>

          {/* Email Field */}
          <div>
            <label
              htmlFor="profile-email"
              className="block text-sm font-medium text-white mb-2"
            >
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-white/40" />
              </div>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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
              htmlFor="profile-phone"
              className="block text-sm font-medium text-white mb-2"
            >
              Phone Number (Optional)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-white/40" />
              </div>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
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

          {/* Save Button */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`
                ${hasChanges 
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600' 
                  : 'bg-white/10 cursor-not-allowed'
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
                  {hasChanges ? 'Save Changes' : 'No Changes'}
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
                <Check className="w-4 h-4" />
                Profile saved
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Privacy Notice */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-md">
        <div className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-white font-medium mb-1">Privacy Notice</h4>
              <p className="text-sm text-white/60">
                Your profile information is encrypted and stored locally on your device. 
                It is never sent to external servers. This information is used to personalize 
                your experience and populate legal documents.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}