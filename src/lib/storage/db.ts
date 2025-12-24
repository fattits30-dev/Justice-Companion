/**
 * IndexedDB Database Schema and Initialization
 *
 * Local-first storage layer for Justice Companion.
 * All user data is stored locally in the browser's IndexedDB.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";

/**
 * Database schema version - increment when schema changes
 */
const DB_VERSION = 1;
const DB_NAME = "justice-companion";

/**
 * IndexedDB Schema Definition
 */
export interface JusticeCompanionDB extends DBSchema {
  /**
   * App settings including encrypted PIN hash
   */
  settings: {
    key: string;
    value: {
      key: string;
      value: string;
      updatedAt: string;
    };
  };

  /**
   * Cases - legal matters the user is tracking
   */
  cases: {
    key: number;
    value: {
      id: number;
      title: string;
      description: string | null;
      caseType: string;
      status: string;
      createdAt: string;
      updatedAt: string;
      // Encrypted JSON blob for sensitive data
      encryptedData?: string;
    };
    indexes: {
      "by-status": string;
      "by-type": string;
      "by-updated": string;
    };
  };

  /**
   * Evidence - documents and files attached to cases
   */
  evidence: {
    key: number;
    value: {
      id: number;
      caseId: number;
      title: string;
      description: string | null;
      fileType: string;
      fileName: string;
      fileSize: number;
      // Base64 encoded file data (encrypted)
      encryptedFileData?: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      "by-case": number;
    };
  };

  /**
   * Notes - user notes attached to cases
   */
  notes: {
    key: number;
    value: {
      id: number;
      caseId: number;
      title: string;
      // Encrypted content
      encryptedContent?: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      "by-case": number;
    };
  };

  /**
   * Timeline events for cases
   */
  timeline: {
    key: number;
    value: {
      id: number;
      caseId: number;
      eventType: string;
      title: string;
      description: string | null;
      eventDate: string;
      createdAt: string;
    };
    indexes: {
      "by-case": number;
      "by-date": string;
    };
  };

  /**
   * Chat conversations with AI
   */
  conversations: {
    key: number;
    value: {
      id: number;
      caseId: number | null;
      title: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      "by-case": number;
    };
  };

  /**
   * Chat messages
   */
  messages: {
    key: number;
    value: {
      id: number;
      conversationId: number;
      role: "user" | "assistant" | "system";
      // Encrypted message content
      encryptedContent?: string;
      createdAt: string;
    };
    indexes: {
      "by-conversation": number;
    };
  };

  /**
   * AI provider configuration (API keys are encrypted)
   */
  aiConfig: {
    key: string;
    value: {
      provider: string;
      // Encrypted API key
      encryptedApiKey?: string;
      model: string;
      enabled: boolean;
      updatedAt: string;
    };
  };

  /**
   * Contacts linked to cases
   */
  contacts: {
    key: number;
    value: {
      id: number;
      caseId: number;
      name: string;
      role: string;
      // Encrypted contact details (phone, email, address)
      encryptedDetails?: string;
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      "by-case": number;
    };
  };

  /**
   * Tasks/reminders for cases
   */
  tasks: {
    key: number;
    value: {
      id: number;
      caseId: number;
      title: string;
      description: string | null;
      dueDate: string | null;
      completed: boolean;
      priority: "low" | "medium" | "high";
      createdAt: string;
      updatedAt: string;
    };
    indexes: {
      "by-case": number;
      "by-due-date": string;
      "by-completed": number;
    };
  };
}

/**
 * Database instance singleton
 */
let dbInstance: IDBPDatabase<JusticeCompanionDB> | null = null;

/**
 * Initialize and open the IndexedDB database
 */
export async function openDatabase(): Promise<
  IDBPDatabase<JusticeCompanionDB>
> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<JusticeCompanionDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, _newVersion, _transaction) {
      // Handle migrations based on version
      if (oldVersion < 1) {
        // Initial schema creation

        // Settings store
        db.createObjectStore("settings", { keyPath: "key" });

        // Cases store
        const casesStore = db.createObjectStore("cases", {
          keyPath: "id",
          autoIncrement: true,
        });
        casesStore.createIndex("by-status", "status");
        casesStore.createIndex("by-type", "caseType");
        casesStore.createIndex("by-updated", "updatedAt");

        // Evidence store
        const evidenceStore = db.createObjectStore("evidence", {
          keyPath: "id",
          autoIncrement: true,
        });
        evidenceStore.createIndex("by-case", "caseId");

        // Notes store
        const notesStore = db.createObjectStore("notes", {
          keyPath: "id",
          autoIncrement: true,
        });
        notesStore.createIndex("by-case", "caseId");

        // Timeline store
        const timelineStore = db.createObjectStore("timeline", {
          keyPath: "id",
          autoIncrement: true,
        });
        timelineStore.createIndex("by-case", "caseId");
        timelineStore.createIndex("by-date", "eventDate");

        // Conversations store
        const conversationsStore = db.createObjectStore("conversations", {
          keyPath: "id",
          autoIncrement: true,
        });
        conversationsStore.createIndex("by-case", "caseId");

        // Messages store
        const messagesStore = db.createObjectStore("messages", {
          keyPath: "id",
          autoIncrement: true,
        });
        messagesStore.createIndex("by-conversation", "conversationId");

        // AI Config store
        db.createObjectStore("aiConfig", { keyPath: "provider" });

        // Contacts store
        const contactsStore = db.createObjectStore("contacts", {
          keyPath: "id",
          autoIncrement: true,
        });
        contactsStore.createIndex("by-case", "caseId");

        // Tasks store
        const tasksStore = db.createObjectStore("tasks", {
          keyPath: "id",
          autoIncrement: true,
        });
        tasksStore.createIndex("by-case", "caseId");
        tasksStore.createIndex("by-due-date", "dueDate");
        tasksStore.createIndex("by-completed", "completed");
      }

      // Future migrations would go here:
      // if (oldVersion < 2) { ... }
    },
    blocked() {
      console.warn("Database upgrade blocked by another tab");
    },
    blocking() {
      // Close db when another tab needs to upgrade
      dbInstance?.close();
      dbInstance = null;
    },
    terminated() {
      dbInstance = null;
    },
  });

  return dbInstance;
}

/**
 * Get the database instance (must call openDatabase first)
 */
export function getDatabase(): IDBPDatabase<JusticeCompanionDB> | null {
  return dbInstance;
}

/**
 * Close the database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Delete the entire database (for testing or data reset)
 */
export async function deleteDatabase(): Promise<void> {
  await closeDatabase();
  await indexedDB.deleteDatabase(DB_NAME);
}

/**
 * Check if database exists and has been initialized
 */
export async function isDatabaseInitialized(): Promise<boolean> {
  const databases = await indexedDB.databases();
  return databases.some((db) => db.name === DB_NAME);
}

/**
 * Get database storage estimate
 */
export async function getStorageEstimate(): Promise<{
  used: number;
  available: number;
  percentUsed: number;
}> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const available = estimate.quota || 0;
    return {
      used,
      available,
      percentUsed: available > 0 ? (used / available) * 100 : 0,
    };
  }
  return { used: 0, available: 0, percentUsed: 0 };
}
