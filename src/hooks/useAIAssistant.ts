/**
 * useAIAssistant Hook
 *
 * React hook for AI-powered legal features:
 * - Case Analysis
 * - Evidence Analysis
 * - Document Drafting
 */

import { useState } from 'react';
import type {
  CaseAnalysisRequest,
  CaseAnalysisResponse,
  EvidenceAnalysisRequest,
  EvidenceAnalysisResponse,
  DocumentDraftRequest,
  DocumentDraftResponse,
} from '../types/ai-analysis.ts';

export interface UseAIAssistantReturn {
  // Case Analysis
  analyzeCase: (request: CaseAnalysisRequest) => Promise<CaseAnalysisResponse | null>;
  isCaseAnalyzing: boolean;
  caseAnalysisError: string | null;

  // Evidence Analysis
  analyzeEvidence: (request: EvidenceAnalysisRequest) => Promise<EvidenceAnalysisResponse | null>;
  isEvidenceAnalyzing: boolean;
  evidenceAnalysisError: string | null;

  // Document Drafting
  draftDocument: (request: DocumentDraftRequest) => Promise<DocumentDraftResponse | null>;
  isDocumentDrafting: boolean;
  documentDraftError: string | null;

  // Clear errors
  clearErrors: () => void;
}

export function useAIAssistant(): UseAIAssistantReturn {
  // Case Analysis State
  const [isCaseAnalyzing, setIsCaseAnalyzing] = useState(false);
  const [caseAnalysisError, setCaseAnalysisError] = useState<string | null>(null);

  // Evidence Analysis State
  const [isEvidenceAnalyzing, setIsEvidenceAnalyzing] = useState(false);
  const [evidenceAnalysisError, setEvidenceAnalysisError] = useState<string | null>(null);

  // Document Drafting State
  const [isDocumentDrafting, setIsDocumentDrafting] = useState(false);
  const [documentDraftError, setDocumentDraftError] = useState<string | null>(null);

  /**
   * Analyze a legal case
   */
  const analyzeCase = async (request: CaseAnalysisRequest): Promise<CaseAnalysisResponse | null> => {
    setIsCaseAnalyzing(true);
    setCaseAnalysisError(null);

    try {
      const response = await window.justiceAPI.analyzeCase(request);

      if (response.success && response.data) {
        return response.data;
      } else {
        const error = !response.success ? response.error.message : 'Failed to analyze case';
        setCaseAnalysisError(error);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setCaseAnalysisError(errorMessage);
      return null;
    } finally {
      setIsCaseAnalyzing(false);
    }
  };

  /**
   * Analyze evidence and identify gaps
   */
  const analyzeEvidence = async (request: EvidenceAnalysisRequest): Promise<EvidenceAnalysisResponse | null> => {
    setIsEvidenceAnalyzing(true);
    setEvidenceAnalysisError(null);

    try {
      const response = await window.justiceAPI.analyzeEvidence(request);

      if (response.success && response.data) {
        return response.data;
      } else {
        const error = !response.success ? response.error.message : 'Failed to analyze evidence';
        setEvidenceAnalysisError(error);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setEvidenceAnalysisError(errorMessage);
      return null;
    } finally {
      setIsEvidenceAnalyzing(false);
    }
  };

  /**
   * Draft a legal document
   */
  const draftDocument = async (request: DocumentDraftRequest): Promise<DocumentDraftResponse | null> => {
    setIsDocumentDrafting(true);
    setDocumentDraftError(null);

    try {
      const response = await window.justiceAPI.draftDocument(request);

      if (response.success && response.data) {
        return response.data;
      } else {
        const error = !response.success ? response.error.message : 'Failed to draft document';
        setDocumentDraftError(error);
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setDocumentDraftError(errorMessage);
      return null;
    } finally {
      setIsDocumentDrafting(false);
    }
  };

  /**
   * Clear all errors
   */
  const clearErrors = () => {
    setCaseAnalysisError(null);
    setEvidenceAnalysisError(null);
    setDocumentDraftError(null);
  };

  return {
    // Case Analysis
    analyzeCase,
    isCaseAnalyzing,
    caseAnalysisError,

    // Evidence Analysis
    analyzeEvidence,
    isEvidenceAnalyzing,
    evidenceAnalysisError,

    // Document Drafting
    draftDocument,
    isDocumentDrafting,
    documentDraftError,

    // Utilities
    clearErrors,
  };
}
