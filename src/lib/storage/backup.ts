/**
 * Backup and Restore - Export/Import Functionality
 *
 * Allows users to export all their data to a JSON file and import it back.
 * This provides a simple backup/restore mechanism for local-first storage.
 */

import { openDatabase, type JusticeCompanionDB } from "./db";
import {
  isEncryptionInitialized,
  encrypt,
  decrypt,
  type EncryptedData,
} from "./crypto";
import { getSettingsRepository } from "./repositories/SettingsRepository";

/**
 * Backup file format version
 */
const BACKUP_VERSION = 1;

/**
 * Backup metadata
 */
export interface BackupMetadata {
  version: number;
  createdAt: string;
  appVersion: string;
  encrypted: boolean;
  stores: string[];
}

/**
 * Full backup structure
 */
export interface BackupData {
  metadata: BackupMetadata;
  data: {
    cases: unknown[];
    notes: unknown[];
    evidence: unknown[];
    timeline: unknown[];
    conversations: unknown[];
    messages: unknown[];
    contacts: unknown[];
    tasks: unknown[];
    settings: unknown[];
    aiConfig: unknown[];
  };
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Include encrypted data as-is (requires same PIN to restore) */
  preserveEncryption?: boolean;
  /** Decrypt data before export (less secure but portable) */
  decryptData?: boolean;
}

/**
 * Import result
 */
export interface ImportResult {
  success: boolean;
  imported: {
    cases: number;
    notes: number;
    evidence: number;
    timeline: number;
    conversations: number;
    messages: number;
    contacts: number;
    tasks: number;
    settings: number;
    aiConfig: number;
  };
  errors: string[];
}

/**
 * Store names type for iteration
 */
type StoreNames =
  | "cases"
  | "notes"
  | "evidence"
  | "timeline"
  | "conversations"
  | "messages"
  | "contacts"
  | "tasks"
  | "settings"
  | "aiConfig";

/**
 * Get all data from a store
 */
async function getAllFromStore<T>(storeName: StoreNames): Promise<T[]> {
  const db = await openDatabase();
  return db.getAll(storeName) as Promise<T[]>;
}

/**
 * Export all data to a backup object
 */
export async function exportData(
  options: ExportOptions = {}
): Promise<BackupData> {
  const { preserveEncryption = true, decryptData = false } = options;

  // Validate options
  if (decryptData && !isEncryptionInitialized()) {
    throw new Error("Cannot decrypt data: encryption not initialized");
  }

  const db = await openDatabase();

  // Collect all data
  const backup: BackupData = {
    metadata: {
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      appVersion: "1.0.0", // TODO: Get from package.json
      encrypted: preserveEncryption && !decryptData,
      stores: [
        "cases",
        "notes",
        "evidence",
        "timeline",
        "conversations",
        "messages",
        "contacts",
        "tasks",
        "settings",
        "aiConfig",
      ],
    },
    data: {
      cases: await getAllFromStore("cases"),
      notes: await getAllFromStore("notes"),
      evidence: await getAllFromStore("evidence"),
      timeline: await getAllFromStore("timeline"),
      conversations: await getAllFromStore("conversations"),
      messages: await getAllFromStore("messages"),
      contacts: await getAllFromStore("contacts"),
      tasks: await getAllFromStore("tasks"),
      settings: await getAllFromStore("settings"),
      aiConfig: await getAllFromStore("aiConfig"),
    },
  };

  // Optionally decrypt all encrypted fields
  if (decryptData && isEncryptionInitialized()) {
    backup.data = await decryptBackupData(backup.data);
  }

  // Record backup time
  const settingsRepo = getSettingsRepository();
  await settingsRepo.recordBackup();

  return backup;
}

/**
 * Decrypt encrypted fields in backup data
 */
async function decryptBackupData(
  data: BackupData["data"]
): Promise<BackupData["data"]> {
  const decrypted = { ...data };

  // Decrypt notes content
  decrypted.notes = await Promise.all(
    data.notes.map(async (note: any) => {
      if (note.encryptedContent) {
        try {
          const encrypted = JSON.parse(note.encryptedContent);
          const content = await decrypt(encrypted);
          return { ...note, content, encryptedContent: undefined };
        } catch {
          return note;
        }
      }
      return note;
    })
  );

  // Decrypt messages content
  decrypted.messages = await Promise.all(
    data.messages.map(async (message: any) => {
      if (message.encryptedContent) {
        try {
          const encrypted = JSON.parse(message.encryptedContent);
          const content = await decrypt(encrypted);
          return { ...message, content, encryptedContent: undefined };
        } catch {
          return message;
        }
      }
      return message;
    })
  );

  // Decrypt contact details
  decrypted.contacts = await Promise.all(
    data.contacts.map(async (contact: any) => {
      if (contact.encryptedDetails) {
        try {
          const encrypted = JSON.parse(contact.encryptedDetails);
          const details = await decrypt(encrypted);
          return {
            ...contact,
            details: JSON.parse(details),
            encryptedDetails: undefined,
          };
        } catch {
          return contact;
        }
      }
      return contact;
    })
  );

  return decrypted;
}

/**
 * Export data as a downloadable JSON file
 */
export async function downloadBackup(
  options: ExportOptions = {}
): Promise<void> {
  const backup = await exportData(options);
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().split("T")[0];
  const filename = `justice-companion-backup-${date}.json`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Import data from a backup object
 */
export async function importData(
  backup: BackupData,
  options: { merge?: boolean; overwrite?: boolean } = {}
): Promise<ImportResult> {
  const { merge = false, overwrite = false } = options;

  // Validate backup format
  if (!backup.metadata || backup.metadata.version !== BACKUP_VERSION) {
    return {
      success: false,
      imported: {
        cases: 0,
        notes: 0,
        evidence: 0,
        timeline: 0,
        conversations: 0,
        messages: 0,
        contacts: 0,
        tasks: 0,
        settings: 0,
        aiConfig: 0,
      },
      errors: ["Invalid or unsupported backup format"],
    };
  }

  const db = await openDatabase();
  const result: ImportResult = {
    success: true,
    imported: {
      cases: 0,
      notes: 0,
      evidence: 0,
      timeline: 0,
      conversations: 0,
      messages: 0,
      contacts: 0,
      tasks: 0,
      settings: 0,
      aiConfig: 0,
    },
    errors: [],
  };

  // Clear existing data if overwriting
  if (overwrite && !merge) {
    const stores: StoreNames[] = [
      "cases",
      "notes",
      "evidence",
      "timeline",
      "conversations",
      "messages",
      "contacts",
      "tasks",
    ];
    for (const store of stores) {
      await db.clear(store);
    }
  }

  // Import each store
  const storeMapping: Array<{
    name: keyof BackupData["data"];
    storeName: StoreNames;
  }> = [
    { name: "cases", storeName: "cases" },
    { name: "notes", storeName: "notes" },
    { name: "evidence", storeName: "evidence" },
    { name: "timeline", storeName: "timeline" },
    { name: "conversations", storeName: "conversations" },
    { name: "messages", storeName: "messages" },
    { name: "contacts", storeName: "contacts" },
    { name: "tasks", storeName: "tasks" },
    { name: "settings", storeName: "settings" },
    { name: "aiConfig", storeName: "aiConfig" },
  ];

  for (const { name, storeName } of storeMapping) {
    const items = backup.data[name] || [];

    for (const item of items) {
      try {
        if (merge) {
          // Check if exists, skip if it does
          const key = (item as any).id || (item as any).key;
          const existing = await db.get(storeName, key);
          if (existing) {
            continue;
          }
        }

        await db.put(storeName, item as any);
        (result.imported as any)[name]++;
      } catch (error) {
        result.errors.push(
          `Failed to import ${name} item: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }
  }

  result.success = result.errors.length === 0;

  return result;
}

/**
 * Import data from a file
 */
export async function importFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const backup = JSON.parse(json) as BackupData;
        const result = await importData(backup, { overwrite: true });
        resolve(result);
      } catch (error) {
        reject(
          new Error(
            `Failed to parse backup file: ${error instanceof Error ? error.message : "Unknown error"}`
          )
        );
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read backup file"));
    };

    reader.readAsText(file);
  });
}

/**
 * Delete all local data (factory reset)
 */
export async function deleteAllData(): Promise<void> {
  const db = await openDatabase();

  const stores: StoreNames[] = [
    "cases",
    "notes",
    "evidence",
    "timeline",
    "conversations",
    "messages",
    "contacts",
    "tasks",
    "settings",
    "aiConfig",
  ];

  for (const store of stores) {
    await db.clear(store);
  }
}

/**
 * Get backup info (last backup date, data counts)
 */
export async function getBackupInfo(): Promise<{
  lastBackup: Date | null;
  counts: Record<string, number>;
}> {
  const settingsRepo = getSettingsRepository();
  const lastBackup = await settingsRepo.getLastBackup();

  const db = await openDatabase();
  const counts: Record<string, number> = {
    cases: await db.count("cases"),
    notes: await db.count("notes"),
    evidence: await db.count("evidence"),
    timeline: await db.count("timeline"),
    conversations: await db.count("conversations"),
    messages: await db.count("messages"),
    contacts: await db.count("contacts"),
    tasks: await db.count("tasks"),
  };

  return { lastBackup, counts };
}
