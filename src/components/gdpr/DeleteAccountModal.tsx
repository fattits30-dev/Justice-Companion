/**
 * Delete Account Modal Component
 *
 * Confirmation dialog for GDPR Article 17 (Right to Erasure).
 * Displays warnings, consequences, and options before account deletion.
 *
 * @module components/gdpr/DeleteAccountModal
 */

import React, { useState } from "react";
import type { DeleteDataRequest } from "../../lib/types/gdpr.ts";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: DeleteDataRequest) => Promise<void>;
  isDeleting: boolean;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isDeleting,
}) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const [exportBeforeDelete, setExportBeforeDelete] = useState(true);
  const [reason, setReason] = useState("");

  if (!isOpen) {
    return null;
  }

  const handleConfirm = async () => {
    if (!acknowledged) {
      return;
    }

    await onConfirm({
      confirmed: true,
      exportBeforeDelete,
      reason: reason || undefined,
    });

    // Reset form
    setAcknowledged(false);
    setExportBeforeDelete(true);
    setReason("");
  };

  const handleCancel = () => {
    setAcknowledged(false);
    setExportBeforeDelete(true);
    setReason("");
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-40" />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-red-600 text-white px-6 py-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg
                  className="h-6 w-6 mr-2"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h2 className="text-2xl font-bold">Delete Account</h2>
              </div>
              <button
                onClick={handleCancel}
                disabled={isDeleting}
                className="text-white hover:text-red-200 disabled:opacity-50"
              >
                <svg
                  className="h-6 w-6"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-6">
            {/* Warning */}
            <div className="bg-red-50 border-l-4 border-red-600 p-4">
              <p className="text-red-800 font-bold text-lg">
                This action cannot be undone!
              </p>
              <p className="text-red-700 mt-2">
                All your data will be permanently deleted from our system. This
                includes all cases, evidence, conversations, and settings.
              </p>
            </div>

            {/* Consequences */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                What will be deleted:
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>All cases and case details</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>All evidence and documents</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>All AI chat conversations</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>Your user profile and settings</span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-red-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>All active sessions</span>
                </li>
              </ul>
            </div>

            {/* What is preserved */}
            <div>
              <h3 className="text-lg font-semibold mb-3">
                What will be preserved (legal requirement):
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    Audit logs (for legal compliance and security
                    investigations)
                  </span>
                </li>
                <li className="flex items-start">
                  <svg
                    className="h-5 w-5 text-green-600 mr-2 shrink-0 mt-0.5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>
                    Consent records (proof of your data processing agreements)
                  </span>
                </li>
              </ul>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportBeforeDelete}
                  onChange={(e) => setExportBeforeDelete(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-1 mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <div>
                  <span className="font-medium">
                    Export my data before deletion
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    We'll create a complete export of your data in JSON format
                    before deleting your account. This gives you a backup of all
                    your information.
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Why are you deleting your account? (optional)
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isDeleting}
                  className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-gray-100"
                  rows={3}
                  maxLength={500}
                  placeholder="Your feedback helps us improve..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  {reason.length}/500 characters
                </p>
              </div>

              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  disabled={isDeleting}
                  className="mt-1 mr-3 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded disabled:opacity-50"
                />
                <span className="font-medium">
                  I understand this action cannot be undone and all my data will
                  be permanently deleted
                </span>
              </label>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
            <button
              onClick={handleCancel}
              disabled={isDeleting}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!acknowledged || isDeleting}
              className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {isDeleting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Deleting Account...
                </>
              ) : (
                "Delete My Account"
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
