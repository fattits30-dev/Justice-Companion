/**
 * Global window type declarations for Justice Companion
 * Defines the justiceAPI interface exposed by Electron preload script
 */

interface JusticeAPI {
  // Auth
  login(username: string, password: string, rememberMe?: boolean): Promise<{ success: boolean; data?: any; error?: any; message?: string }>;
  register(username: string, email: string, password: string): Promise<{ success: boolean; data?: any; error?: any; message?: string }>;
  logout(sessionId: string): Promise<{ success: boolean }>;
  getSession(sessionId: string): Promise<{ success: boolean; data?: any; error?: any }>;

  // Consent (GDPR)
  grantConsent(type: string, granted: boolean): Promise<{ success: boolean; error?: any }>;

  // Dashboard
  getDashboardStats(sessionId: string): Promise<{ success: boolean; data?: any; error?: any }>;

  // Cases
  getAllCases(): Promise<{ success: boolean; data?: any; error?: any }>;
  getCaseFacts(caseId: number): Promise<{ success: boolean; data?: any; error?: any }>;

  // AI Configuration
  configureAI(config: { apiKey: string; provider?: 'openai' | 'groq' | 'anthropic' | 'google' | 'cohere' | 'mistral'; model?: string; organization?: string }): Promise<{ success: boolean; data?: any; error?: any }>;

  // Chat Streaming
  streamChat(
    request: {
      sessionId: string;
      message: string;
      conversationId?: number | null;
    },
    onToken: (token: string) => void,
    onThinking: (thinking: string) => void,
    onComplete: () => void,
    onError: (error: string) => void
  ): Promise<void>;

  // Secure Storage (flat methods - used by Settings)
  secureStorageSet(key: string, value: string): Promise<{ success: boolean; error?: any }>;
  secureStorageGet(key: string): Promise<{ success: boolean; data?: string; error?: any }>;
  secureStorageDelete(key: string): Promise<{ success: boolean; error?: any }>;
  secureStorageHas(key: string): Promise<{ success: boolean; data: boolean; error?: any }>;

  // Secure Storage (nested API - legacy, used by SecureStorageService)
  secureStorage: {
    isEncryptionAvailable(): Promise<boolean>;
    set(key: string, value: string): Promise<void>;
    get(key: string): Promise<string | null>;
    delete(key: string): Promise<void>;
    clearAll(): Promise<void>;
  };
}

declare global {
  interface Window {
    justiceAPI: JusticeAPI;
  }
}

export {};
