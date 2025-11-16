/**
 * Electron Preload Script - HTTP API Bridge
 *
 * ARCHITECTURE: Frontend uses Python FastAPI backend (HTTP REST API on port 8000)
 *
 * This preload provides a compatibility bridge for legacy code that uses window.justiceAPI.
 * All calls are forwarded to the Python FastAPI backend via HTTP fetch.
 *
 * Security:
 * - contextIsolation: true
 * - nodeIntegration: false
 * - sandbox: true
 */

// Common JS require for Electron preload (sandboxed context doesn't support ESM)
 
const { contextBridge } = require("electron");

console.log("[PRELOAD] Loading HTTP API bridge for Python FastAPI backend");
console.log("[PRELOAD] Backend URL: http://127.0.0.1:8000");

const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * HTTP API Bridge for window.justiceAPI
 *
 * Provides compatibility for legacy IPC code by forwarding calls to Python backend
 */
const createAPIBridge = () => {
  const fetchAPI = async (endpoint: string, options: RequestInit = {}) => {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      return await response.json();
    } catch (error) {
      console.error(`[PRELOAD] API Error for ${endpoint}:`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  };

  return {
    // Dashboard
    getDashboardStats: async (sessionId: string) => {
      return fetchAPI(`/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    // Cases
    getAllCases: async (sessionId: string) => {
      return fetchAPI(`/cases/`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    getCaseById: async (id: string, sessionId: string) => {
      return fetchAPI(`/cases/${id}`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    createCase: async (data: any, sessionId: string, aiMetadata?: any) => {
      return fetchAPI(`/cases/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
        body: JSON.stringify(data),
      });
    },

    updateCase: async (id: string, data: any, sessionId: string) => {
      return fetchAPI(`/cases/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionId}` },
        body: JSON.stringify(data),
      });
    },

    deleteCase: async (id: string, sessionId: string) => {
      return fetchAPI(`/cases/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    // Evidence
    getEvidenceByCaseId: async (caseId: string, sessionId: string) => {
      return fetchAPI(`/evidence/case/${caseId}`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    deleteEvidence: async (id: string, sessionId: string) => {
      return fetchAPI(`/evidence/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    // Deadlines
    getDeadlines: async (sessionId: string, caseId?: number) => {
      const url = caseId ? `/deadlines/?caseId=${caseId}` : '/deadlines/';
      return fetchAPI(url, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    createDeadline: async (data: any, sessionId: string) => {
      return fetchAPI(`/deadlines/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
        body: JSON.stringify(data),
      });
    },

    updateDeadline: async (id: number, data: any, sessionId: string) => {
      return fetchAPI(`/deadlines/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${sessionId}` },
        body: JSON.stringify(data),
      });
    },

    deleteDeadline: async (id: number, sessionId: string) => {
      return fetchAPI(`/deadlines/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    completeDeadline: async (id: number, sessionId: string) => {
      return fetchAPI(`/deadlines/${id}/complete`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    // Case Facts
    getCaseFacts: async (caseId: number, sessionId: string) => {
      return fetchAPI(`/cases/${caseId}/facts`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    createCaseFact: async (data: any, sessionId: string) => {
      return fetchAPI(`/cases/facts`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${sessionId}` },
        body: JSON.stringify(data),
      });
    },

    // Chat / AI
    getRecentConversations: async (sessionId: string, caseId: number | null, limit?: number) => {
      const params = new URLSearchParams();
      if (caseId !== null) {params.append('caseId', String(caseId));}
      if (limit) {params.append('limit', String(limit));}

      return fetchAPI(`/chat/conversations?${params}`, {
        headers: { 'Authorization': `Bearer ${sessionId}` },
      });
    },

    analyzeCase: async (request: any) => {
      return fetchAPI(`/ai/analyze-case`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    analyzeEvidence: async (request: any) => {
      return fetchAPI(`/ai/analyze-evidence`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    draftDocument: async (request: any) => {
      return fetchAPI(`/ai/draft-document`, {
        method: 'POST',
        body: JSON.stringify(request),
      });
    },

    // Consent
    grantConsent: async (consentType: string, granted: boolean) => {
      return fetchAPI(`/gdpr/consent`, {
        method: 'POST',
        body: JSON.stringify({ consentType, granted }),
      });
    },

    // Secure Storage (placeholder - returns not implemented)
    secureStorage: {
      isEncryptionAvailable: async () => ({ success: true, data: true }),
      set: async () => ({ success: false, error: { message: 'Use HTTP API' } }),
      get: async () => ({ success: false, error: { message: 'Use HTTP API' } }),
      delete: async () => ({ success: false, error: { message: 'Use HTTP API' } }),
      clearAll: async () => ({ success: false, error: { message: 'Use HTTP API' } }),
    },
  };
};

/**
 * Expose minimal Electron API to renderer process
 */
contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

/**
 * Expose justiceAPI bridge for backwards compatibility
 */
contextBridge.exposeInMainWorld("justiceAPI", createAPIBridge());

console.log("[PRELOAD] HTTP API bridge loaded - all calls forwarded to Python backend");
