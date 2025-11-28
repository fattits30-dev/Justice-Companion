/**
 * Document Analysis Results Component
 *
 * Displays AI document analysis results including:
 * - Extracted text summary
 * - Document type classification
 * - Key facts identified
 * - Dates found
 * - Parties identified
 * - NAME DETECTION: Warns if document doesn't appear to belong to current user
 *
 * @module DocumentAnalysisResults
 */

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  ExternalLink,
  FileText,
  Info,
  List,
  Scale,
  Users,
} from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "../../contexts/AuthContext.tsx";
import type {
  AIDocumentAnalysis,
  NameDetectionResult,
} from "../../types/ai.ts";
import { Badge } from "../ui/Badge.tsx";
import { Card } from "../ui/Card.tsx";

interface DocumentAnalysisResultsProps {
  analysis: AIDocumentAnalysis;
  fileName?: string;
  onClose?: () => void;
}

/**
 * Check if user's name appears in the identified parties
 */
function detectUserInParties(
  username: string,
  email: string,
  parties: string[]
): NameDetectionResult {
  const usernameLower = username.toLowerCase();
  const emailPrefix = email.split("@")[0].toLowerCase();

  // Common name patterns to check
  const namePatternsToCheck = [
    usernameLower,
    emailPrefix,
    // Handle common username formats like "testuser555" or "john.doe"
    usernameLower.replace(/[0-9]/g, ""),
    emailPrefix.replace(/[0-9]/g, ""),
  ].filter(Boolean);

  let matchedParty: string | null = null;

  for (const party of parties) {
    const partyLower = party.toLowerCase();

    // Check if any of our name patterns appear in the party
    for (const pattern of namePatternsToCheck) {
      if (pattern && pattern.length >= 3 && partyLower.includes(pattern)) {
        matchedParty = party;
        break;
      }
    }

    if (matchedParty) {
      break;
    }
  }

  // Try to identify who the document IS about (first person mentioned that isn't an org)
  const potentialOwners = parties.filter((party) => {
    const partyLower = party.toLowerCase();
    // Filter out obvious organizations (Ltd, Inc, PLC, Corp, etc.)
    return !/(ltd|limited|plc|inc|corp|company|department|council|committee)/i.test(
      partyLower
    );
  });

  return {
    userNameFound: matchedParty !== null,
    matchedParty,
    allParties: parties,
    suggestedOwner:
      !matchedParty && potentialOwners.length > 0 ? potentialOwners[0] : null,
  };
}

/**
 * Get badge variant for document type
 */
function getDocumentTypeBadge(type: string): {
  variant: "primary" | "secondary" | "success" | "warning" | "danger";
  label: string;
} {
  const typeMap: Record<
    string,
    {
      variant: "primary" | "secondary" | "success" | "warning" | "danger";
      label: string;
    }
  > = {
    contract: { variant: "primary", label: "Contract" },
    letter: { variant: "secondary", label: "Letter" },
    payslip: { variant: "success", label: "Payslip" },
    form: { variant: "warning", label: "Form" },
    court_document: { variant: "danger", label: "Court Document" },
    evidence_photo: { variant: "primary", label: "Evidence Photo" },
    handwritten: { variant: "secondary", label: "Handwritten" },
    unknown: { variant: "secondary", label: "Document" },
  };

  return typeMap[type] || typeMap.unknown;
}

/**
 * Get confidence level color
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) {
    return "text-green-400";
  }
  if (confidence >= 0.7) {
    return "text-yellow-400";
  }
  return "text-red-400";
}

export function DocumentAnalysisResults({
  analysis,
  fileName,
  onClose,
}: DocumentAnalysisResultsProps) {
  const { user } = useAuth();

  // Run name detection
  const nameDetection = useMemo(() => {
    if (!user) {
      return null;
    }
    return detectUserInParties(
      user.username,
      user.email,
      analysis.parties_identified
    );
  }, [user, analysis.parties_identified]);

  const docTypeBadge = getDocumentTypeBadge(analysis.document_type);
  const confidencePercent = Math.round(analysis.confidence * 100);

  return (
    <Card variant="glass" className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/20 rounded-lg">
            <Scale className="h-6 w-6 text-purple-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Document Analysis
            </h3>
            {fileName && <p className="text-sm text-white/70">{fileName}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={docTypeBadge.variant}>{docTypeBadge.label}</Badge>
          <span
            className={`text-sm font-medium ${getConfidenceColor(analysis.confidence)}`}
          >
            {confidencePercent}% confidence
          </span>
        </div>
      </div>

      {/* ⚠️ NAME DETECTION WARNING */}
      {nameDetection && !nameDetection.userNameFound && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-6 w-6 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-400 font-semibold mb-1">
                This document may not be yours
              </h4>
              <p className="text-sm text-white/80">
                Your name (<span className="font-medium">{user?.username}</span>
                ) wasn't found in this document.
                {nameDetection.suggestedOwner && (
                  <>
                    {" "}
                    It appears to be about{" "}
                    <span className="font-medium text-amber-300">
                      {nameDetection.suggestedOwner}
                    </span>
                    .
                  </>
                )}
              </p>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <ExternalLink className="h-4 w-4 text-amber-400" />
                <span className="text-white/70">
                  If this belongs to someone else, tell them about Justice
                  Companion!
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ✅ NAME FOUND CONFIRMATION */}
      {nameDetection && nameDetection.userNameFound && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg"
        >
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-sm text-green-300">
              Document verified - found your name:{" "}
              <span className="font-medium">{nameDetection.matchedParty}</span>
            </p>
          </div>
        </motion.div>
      )}

      {/* Key Facts */}
      {analysis.key_facts.length > 0 && (
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <List className="h-4 w-4 text-cyan-400" />
            Key Facts
          </h4>
          <ul className="space-y-2">
            {analysis.key_facts.map((fact, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-white/80"
              >
                <span className="text-cyan-400 mt-1">•</span>
                <span>{fact}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dates Found */}
      {analysis.dates_found.length > 0 && (
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Calendar className="h-4 w-4 text-blue-400" />
            Important Dates
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.dates_found.map((date, index) => (
              <Badge key={index} variant="secondary" size="sm">
                {date}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Parties Identified */}
      {analysis.parties_identified.length > 0 && (
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Users className="h-4 w-4 text-purple-400" />
            Parties Identified
          </h4>
          <div className="flex flex-wrap gap-2">
            {analysis.parties_identified.map((party, index) => (
              <Badge
                key={index}
                variant={
                  nameDetection?.matchedParty === party
                    ? "success"
                    : "secondary"
                }
                size="sm"
              >
                {party}
                {nameDetection?.matchedParty === party && (
                  <CheckCircle className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Relevance Notes */}
      {analysis.relevance_notes && (
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
            <Info className="h-4 w-4 text-gray-400" />
            Legal Relevance
          </h4>
          <div className="p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm text-white/80 whitespace-pre-wrap">
              {analysis.relevance_notes}
            </p>
          </div>
        </div>
      )}

      {/* Extracted Text Preview */}
      <div className="mb-4">
        <h4 className="flex items-center gap-2 text-sm font-semibold text-white mb-3">
          <FileText className="h-4 w-4 text-gray-400" />
          Extracted Text Preview
        </h4>
        <div className="p-4 bg-gray-900/50 rounded-lg border border-white/10 max-h-[200px] overflow-y-auto">
          <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono">
            {analysis.extracted_text.slice(0, 2000)}
            {analysis.extracted_text.length > 2000 && "..."}
          </pre>
        </div>
        <p className="text-xs text-white/50 mt-2">
          {analysis.extracted_text.length.toLocaleString()} characters extracted
        </p>
      </div>

      {/* Close button */}
      {onClose && (
        <div className="flex justify-end pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/70 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </Card>
  );
}
