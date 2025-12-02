import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Save,
  AlertCircle,
  Check,
  Phone,
  Pencil,
  X,
} from "lucide-react";
import { Card } from "../../components/ui/Card.tsx";
import { Button } from "../../components/ui/Button.tsx";
import { toast } from "sonner";
import { logger } from "../../utils/logger.ts";
import { apiClient } from "../../lib/apiClient.ts";

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
  const [isEditing, setIsEditing] = useState(false);

  // Form state - split name into first and last
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  // Original values for cancel
  const [originalValues, setOriginalValues] = useState({
    username: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

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
      setHasChanges(
        usernameChanged || nameChanged || emailChanged || phoneChanged,
      );
    }
  }, [username, firstName, lastName, email, phone, profile]);

  const loadProfile = async () => {
    try {
      setLoading(true);

      // Use apiClient instead of legacy window.justiceAPI
      const response = await apiClient.profile.get();

      if (response.success && response.data) {
        // apiClient.profile.get() returns ApiResponse with data
        const profileData = response.data as {
          id: number;
          name: string;
          email?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          phone?: string | null;
          avatarUrl?: string | null;
          createdAt?: string;
          updatedAt?: string;
        };

        const transformedProfile: UserProfile = {
          id: profileData.id,
          name: profileData.name || "",
          email: profileData.email || null,
          username: undefined, // Backend doesn't return username separately
          phone: profileData.phone || undefined,
          avatarUrl: profileData.avatarUrl || null,
          createdAt: profileData.createdAt || "",
          updatedAt: profileData.updatedAt || "",
        };
        setProfile(transformedProfile);

        // Use firstName/lastName from backend if available, otherwise split name
        const fname =
          profileData.firstName || profileData.name?.split(" ")[0] || "";
        const lname =
          profileData.lastName ||
          profileData.name?.split(" ").slice(1).join(" ") ||
          "";
        const em = profileData.email || "";
        const ph = profileData.phone || "";

        setUsername(""); // Not used in new backend
        setFirstName(fname);
        setLastName(lname);
        setEmail(em);
        setPhone(ph);

        // Store original values for cancel
        setOriginalValues({
          username: "",
          firstName: fname,
          lastName: lname,
          email: em,
          phone: ph,
        });
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

      // Save profile using apiClient
      const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
      const response = await apiClient.profile.update({
        name: fullName,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });

      if (response.success && response.data) {
        const profileData = response.data as {
          id: number;
          name: string;
          email?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          phone?: string | null;
        };

        const transformedProfile: UserProfile = {
          id: profileData.id,
          name: profileData.name || "",
          email: profileData.email || null,
          username: undefined,
          phone: profileData.phone || undefined,
          avatarUrl: null,
          createdAt: "",
          updatedAt: "",
        };
        setProfile(transformedProfile);
        setHasChanges(false);
        setIsEditing(false);

        // Update original values
        setOriginalValues({
          username: "",
          firstName: profileData.firstName || firstName.trim(),
          lastName: profileData.lastName || lastName.trim(),
          email: profileData.email || "",
          phone: profileData.phone || "",
        });

        toast.success("Profile updated successfully!");
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      logger.error("Failed to save profile:", error);
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Restore original values
    setUsername(originalValues.username);
    setFirstName(originalValues.firstName);
    setLastName(originalValues.lastName);
    setEmail(originalValues.email);
    setPhone(originalValues.phone);
    setHasChanges(false);
    setIsEditing(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Profile</h2>
          <p className="text-white/60">Manage your personal information</p>
        </div>
        {!isEditing && (
          <Button
            onClick={() => setIsEditing(true)}
            className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
          >
            <Pencil className="w-4 h-4" />
            Edit Profile
          </Button>
        )}
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
                disabled={!isEditing}
                className={`w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${!isEditing ? "opacity-70 cursor-not-allowed" : ""}`}
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
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${!isEditing ? "opacity-70 cursor-not-allowed" : ""}`}
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
                  disabled={!isEditing}
                  className={`w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${!isEditing ? "opacity-70 cursor-not-allowed" : ""}`}
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
                disabled={!isEditing}
                className={`w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${!isEditing ? "opacity-70 cursor-not-allowed" : ""}`}
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
                disabled={!isEditing}
                className={`w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-hidden focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all ${!isEditing ? "opacity-70 cursor-not-allowed" : ""}`}
                placeholder="+44 7700 900000"
              />
            </div>
            <p className="mt-1 text-xs text-white/40">
              Your contact number for urgent case updates
            </p>
          </div>

          {/* Last Updated */}
          {profile && profile.updatedAt && (
            <div className="pt-4 border-t border-white/10">
              <p className="text-sm text-white/40">
                Last updated:{" "}
                {(() => {
                  const date = new Date(profile.updatedAt);
                  return isNaN(date.getTime())
                    ? "Unknown"
                    : date.toLocaleString();
                })()}
              </p>
            </div>
          )}

          {/* Save Button - only show when editing */}
          {isEditing && (
            <div className="flex items-center gap-4">
              <Button
                onClick={handleCancel}
                className="bg-white/10 hover:bg-white/20 text-white border border-white/20"
              >
                <X className="w-4 h-4" />
                Cancel
              </Button>
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
                    Save Changes
                  </>
                )}
              </Button>

              {hasChanges && !saving && (
                <span className="text-sm text-yellow-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </span>
              )}
            </div>
          )}

          {!isEditing && profile && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-green-400 flex items-center gap-1">
                <Check className="w-4 h-4" />
                Profile saved
              </span>
            </div>
          )}
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
                Your profile information is encrypted and stored locally on your
                device. It is never sent to external servers. This information
                is used to personalize your experience and populate legal
                documents.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
