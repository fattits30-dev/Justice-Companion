/**
 * GDPR Dashboard Component
 *
 * Provides user interface for GDPR compliance operations:
 * - Article 20: Data Portability (export user data)
 * - Article 17: Right to Erasure (delete account)
 * - Consent management
 * - Rate limit status
 *
 * @module components/gdpr/GdprDashboard
 */

import React, { useState, useEffect, useCallback } from "react";
import { apiClient, ApiError } from "../../lib/apiClient.ts";
import type { ConsentRecord, DeleteDataResponse } from "../../lib/types/gdpr";

interface GdprDashboardProps {
  sessionId: string;
  onLogout?: () => void;
}

export const GdprDashboard: React.FC<GdprDashboardProps> = ({
  sessionId,
  onLogout,
}) => {
  // GDPR export only supports json and csv formats
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [exportFormat, setExportFormat] = useState<"json" | "csv">("json");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [exportBeforeDelete, setExportBeforeDelete] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadConsents = useCallback(async () => {
    try {
      apiClient.setSessionId(sessionId);
      const response = await apiClient.gdpr.getConsents();

      if (response.success && response.data) {
        setConsents(response.data.consents);
      }
    } catch (err) {
      console.error("Failed to load consents:", err);
      setError(err instanceof Error ? err.message : "Failed to load consents");
    }
  }, [sessionId]);

  // Load consents on mount
  useEffect(() => {
    loadConsents();
  }, [loadConsents]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setError(null);
      setSuccess(null);

      apiClient.setSessionId(sessionId);
      const response = await apiClient.gdpr.exportData({
        format: exportFormat,
      });

      if (response.success && response.data) {
        setSuccess(
          `Data exported successfully! ${response.data.totalRecords} records exported to ${response.data.filePath}`,
        );
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isStatus(429)) {
          setError(
            "Export limit reached. You can export 5 times per 24 hours.",
          );
        } else if (err.isStatus(403)) {
          setError("Active consent required for data export.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Export failed");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setError(null);
      setSuccess(null);

      apiClient.setSessionId(sessionId);
      const response = await apiClient.gdpr.deleteData({
        confirmed: true,
        exportBeforeDelete,
        reason: deleteReason || undefined,
      });

      if (response.success && response.data) {
        const data = response.data as DeleteDataResponse;
        const totalDeleted = Object.values(data.deletedCounts).reduce(
          (sum, count) => sum + count,
          0,
        );

        setSuccess(
          `Account deleted successfully. ${totalDeleted} records removed. ${data.preservedAuditLogs} audit logs preserved.`,
        );

        // Logout after 3 seconds
        setTimeout(() => {
          if (onLogout) {
            onLogout();
          }
        }, 3000);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.isStatus(429)) {
          setError(
            "Deletion limit reached. You can delete your account once per 30 days.",
          );
        } else if (err.isStatus(403)) {
          setError("Active consent required for account deletion.");
        } else {
          setError(err.message);
        }
      } else {
        setError(err instanceof Error ? err.message : "Deletion failed");
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleConsentChange = async (consentType: string, granted: boolean) => {
    try {
      setError(null);
      apiClient.setSessionId(sessionId);
      const response = await apiClient.gdpr.updateConsent({
        consentType,
        granted,
      });

      if (response.success) {
        setSuccess(`Consent updated: ${consentType}`);
        loadConsents(); // Reload consents
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update consent");
    }
  };

  const getConsentValue = (consentType: string): boolean => {
    const consent = consents.find((c) => c.consentType === consentType);
    return consent ? consent.granted && !consent.revokedAt : false;
  };

  return (
    <div className="gdpr-dashboard p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">GDPR Data Rights</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}

      {/* Article 20 - Right to Data Portability */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Export Your Data (Article 20)
        </h2>
        <p className="mb-4 text-gray-700">
          You can export all your data in a machine-readable format. This
          includes all cases, evidence, conversations, and settings.
        </p>
        <p className="mb-4 text-sm text-gray-600">
          Rate limit: 5 exports per 24 hours
        </p>

        <div className="mb-4">
          <label
            id="export-format-label"
            className="block text-sm font-medium mb-2"
          >
            Export Format
          </label>
          <select
            aria-labelledby="export-format-label"
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as "json" | "csv")}
            className="w-full p-2 border rounded"
          >
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
          </select>
        </div>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isExporting ? "Exporting..." : "Export Data"}
        </button>
      </section>

      {/* Article 17 - Right to Erasure */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Delete Your Account (Article 17)
        </h2>
        <p className="mb-4 text-gray-700">
          You can permanently delete your account and all associated data. This
          action is irreversible.
        </p>
        <p className="mb-4 text-sm text-gray-600">
          Rate limit: 1 deletion per 30 days
        </p>

        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isDeleting}
          className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700 disabled:bg-gray-400"
        >
          Delete Account
        </button>
      </section>

      {/* Consent Management */}
      <section className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Consent Management</h2>
        <p className="mb-4 text-gray-700">
          Manage your consent for data processing activities.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label htmlFor="consent-terms" className="font-medium">
              Terms of Service
            </label>
            <input
              id="consent-terms"
              type="checkbox"
              checked={getConsentValue("terms_of_service")}
              onChange={(e) =>
                handleConsentChange("terms_of_service", e.target.checked)
              }
              className="h-6 w-6 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="consent-privacy" className="font-medium">
              Privacy Policy
            </label>
            <input
              id="consent-privacy"
              type="checkbox"
              checked={getConsentValue("privacy_policy")}
              onChange={(e) =>
                handleConsentChange("privacy_policy", e.target.checked)
              }
              className="h-6 w-6 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="consent-analytics" className="font-medium">
              Analytics Tracking
            </label>
            <input
              id="consent-analytics"
              type="checkbox"
              checked={getConsentValue("analytics_tracking")}
              onChange={(e) =>
                handleConsentChange("analytics_tracking", e.target.checked)
              }
              className="h-6 w-6 rounded"
            />
          </div>
          <div className="flex items-center justify-between">
            <label htmlFor="consent-marketing" className="font-medium">
              Marketing Communications
            </label>
            <input
              id="consent-marketing"
              type="checkbox"
              checked={getConsentValue("marketing_communications")}
              onChange={(e) =>
                handleConsentChange(
                  "marketing_communications",
                  e.target.checked,
                )
              }
              className="h-6 w-6 rounded"
            />
          </div>
        </div>
      </section>

      {/* Deletion Confirmation Modal */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
        >
          <div className="bg-white p-8 rounded-lg shadow-2xl max-w-md w-full">
            <h2 id="delete-modal-title" className="text-2xl font-bold mb-4">
              Confirm Account Deletion
            </h2>
            <p className="mb-4">
              This action is permanent and cannot be undone. Are you sure you
              want to delete your account?
            </p>
            <div className="mb-4">
              <label
                htmlFor="export-before-delete"
                className="flex items-center"
              >
                <input
                  id="export-before-delete"
                  type="checkbox"
                  checked={exportBeforeDelete}
                  onChange={(e) => setExportBeforeDelete(e.target.checked)}
                  className="h-5 w-5 rounded mr-2"
                />
                <span>Export my data before deleting</span>
              </label>
            </div>
            <div className="mb-6">
              <label
                htmlFor="delete-reason"
                className="block text-sm font-medium mb-2"
              >
                Reason for leaving (optional)
              </label>
              <textarea
                id="delete-reason"
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                placeholder="Your feedback helps us improve."
              />
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                {isDeleting ? "Deleting..." : "Confirm Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
