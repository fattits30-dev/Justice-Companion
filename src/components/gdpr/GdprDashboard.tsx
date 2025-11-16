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

import React, { useState, useEffect } from "react";
import { apiClient, ApiError } from "../../lib/apiClient.ts";
import type {
  ConsentRecord,
  DeleteDataResponse,
} from "../../lib/types/gdpr.ts";

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

  // Load consents on mount
  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
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
  };

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
          <label className="block text-sm font-medium mb-2">
            Export Format
          </label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as "json" | "csv")}
            className="w-full p-2 border rounded"
            disabled={isExporting}
          >
            <option value="json">JSON (structured data)</option>
            <option value="csv">CSV (spreadsheet compatible)</option>
          </select>
        </div>

        <button
          onClick={handleExport}
          disabled={isExporting || !getConsentValue("data_processing")}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isExporting ? "Exporting..." : "Export Data"}
        </button>

        {!getConsentValue("data_processing") && (
          <p className="mt-2 text-sm text-red-600">
            You must grant data processing consent to export data.
          </p>
        )}
      </section>

      {/* Article 17 - Right to Erasure */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">
          Delete Your Account (Article 17)
        </h2>
        <p className="mb-4 text-gray-700">
          Permanently delete all your data from our system. This action cannot
          be undone.
        </p>
        <p className="mb-4 text-sm text-gray-600">
          Rate limit: 1 deletion per 30 days
        </p>
        <p className="mb-4 text-sm text-yellow-700">
          Note: Audit logs and consent records will be preserved for legal
          compliance.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!getConsentValue("data_erasure_request")}
            className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Delete My Account
          </button>
        ) : (
          <div className="border-2 border-red-400 p-4 rounded">
            <h3 className="text-xl font-semibold mb-4 text-red-700">
              Confirm Account Deletion
            </h3>
            <p className="mb-4 text-red-600 font-bold">
              WARNING: This will permanently delete all your data. This action
              cannot be undone.
            </p>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={exportBeforeDelete}
                  onChange={(e) => setExportBeforeDelete(e.target.checked)}
                  className="mr-2"
                />
                <span className="text-sm">Export my data before deletion</span>
              </label>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Reason for deletion (optional)
              </label>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                className="w-full p-2 border rounded"
                rows={3}
                maxLength={500}
                placeholder="Why are you deleting your account?"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting}
                className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
              >
                {isDeleting ? "Deleting..." : "Confirm Deletion"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-6 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!getConsentValue("data_erasure_request") && (
          <p className="mt-2 text-sm text-red-600">
            You must grant data erasure consent to delete your account.
          </p>
        )}
      </section>

      {/* Consent Management */}
      <section className="mb-8 p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-2xl font-semibold mb-4">Consent Management</h2>
        <p className="mb-4 text-gray-700">
          Manage your data processing consents. These consents control what
          operations you can perform.
        </p>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h3 className="font-medium">Data Processing</h3>
              <p className="text-sm text-gray-600">
                Required for exporting your data
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={getConsentValue("data_processing")}
                onChange={(e) =>
                  handleConsentChange("data_processing", e.target.checked)
                }
                className="sr-only"
              />
              <div
                className={`w-12 h-6 rounded-full transition ${
                  getConsentValue("data_processing")
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                    getConsentValue("data_processing")
                      ? "translate-x-7 mt-1"
                      : "translate-x-1 mt-1"
                  }`}
                />
              </div>
            </label>
          </div>

          <div className="flex items-center justify-between p-3 border rounded">
            <div>
              <h3 className="font-medium">Data Erasure Request</h3>
              <p className="text-sm text-gray-600">
                Required for deleting your account
              </p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={getConsentValue("data_erasure_request")}
                onChange={(e) =>
                  handleConsentChange("data_erasure_request", e.target.checked)
                }
                className="sr-only"
              />
              <div
                className={`w-12 h-6 rounded-full transition ${
                  getConsentValue("data_erasure_request")
                    ? "bg-blue-600"
                    : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 bg-white rounded-full shadow transform transition ${
                    getConsentValue("data_erasure_request")
                      ? "translate-x-7 mt-1"
                      : "translate-x-1 mt-1"
                  }`}
                />
              </div>
            </label>
          </div>
        </div>
      </section>

      {/* Consent History */}
      {consents.length > 0 && (
        <section className="mb-8 p-6 bg-white rounded-lg shadow-sm">
          <h2 className="text-2xl font-semibold mb-4">Consent History</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b">
                <tr>
                  <th className="p-2">Consent Type</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Granted At</th>
                  <th className="p-2">Revoked At</th>
                </tr>
              </thead>
              <tbody>
                {consents.map((consent) => (
                  <tr key={consent.id} className="border-b">
                    <td className="p-2">{consent.consentType}</td>
                    <td className="p-2">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          consent.granted && !consent.revokedAt
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {consent.granted && !consent.revokedAt
                          ? "Active"
                          : "Revoked"}
                      </span>
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {consent.grantedAt
                        ? new Date(consent.grantedAt).toLocaleString()
                        : "-"}
                    </td>
                    <td className="p-2 text-sm text-gray-600">
                      {consent.revokedAt
                        ? new Date(consent.revokedAt).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
