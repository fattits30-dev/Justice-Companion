/**
 * Base Repository Class for IndexedDB Operations
 *
 * Provides common CRUD operations with optional encryption support.
 * Specific repositories extend this class for entity-specific logic.
 */

import type { IDBPDatabase, StoreNames } from "idb";
import type { JusticeCompanionDB } from "../db";
import { openDatabase } from "../db";
import {
  encrypt,
  decrypt,
  encryptObject,
  decryptObject,
  isEncryptionInitialized,
  type EncryptedData,
} from "../crypto";

/**
 * Base entity interface - all entities have these fields
 */
export interface BaseEntity {
  id: number;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Options for repository operations
 */
export interface RepositoryOptions {
  /** Fields to encrypt before storage */
  encryptedFields?: string[];
  /** Whether encryption is required (throws if not initialized) */
  requireEncryption?: boolean;
}

/**
 * Generic base repository for IndexedDB operations
 */
export abstract class BaseRepository<
  StoreName extends StoreNames<JusticeCompanionDB>,
  Entity extends BaseEntity,
> {
  protected storeName: StoreName;
  protected options: RepositoryOptions;

  constructor(storeName: StoreName, options: RepositoryOptions = {}) {
    this.storeName = storeName;
    this.options = options;
  }

  /**
   * Get the database instance
   */
  protected async getDb(): Promise<IDBPDatabase<JusticeCompanionDB>> {
    return openDatabase();
  }

  /**
   * Check if encryption is available and required
   */
  protected checkEncryption(): void {
    if (this.options.requireEncryption && !isEncryptionInitialized()) {
      throw new Error("Encryption required but not initialized");
    }
  }

  /**
   * Encrypt specified fields in an object
   */
  protected async encryptFields<T extends Record<string, unknown>>(
    data: T
  ): Promise<T> {
    if (!this.options.encryptedFields || !isEncryptionInitialized()) {
      return data;
    }

    const result = { ...data };
    for (const field of this.options.encryptedFields) {
      if (field in result && result[field] !== null && result[field] !== undefined) {
        const value = result[field];
        const encrypted = typeof value === "string"
          ? await encrypt(value)
          : await encryptObject(value);
        (result as Record<string, unknown>)[`encrypted${capitalize(field)}`] = JSON.stringify(encrypted);
        delete (result as Record<string, unknown>)[field];
      }
    }
    return result;
  }

  /**
   * Decrypt specified fields in an object
   */
  protected async decryptFields<T extends Record<string, unknown>>(
    data: T
  ): Promise<T> {
    if (!this.options.encryptedFields || !isEncryptionInitialized()) {
      return data;
    }

    const result = { ...data };
    for (const field of this.options.encryptedFields) {
      const encryptedKey = `encrypted${capitalize(field)}`;
      if (encryptedKey in result && result[encryptedKey]) {
        try {
          const encryptedData = JSON.parse(result[encryptedKey] as string) as EncryptedData;
          const decrypted = await decrypt(encryptedData);
          // Try to parse as JSON, otherwise use as string
          try {
            (result as Record<string, unknown>)[field] = JSON.parse(decrypted);
          } catch {
            (result as Record<string, unknown>)[field] = decrypted;
          }
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          (result as Record<string, unknown>)[field] = null;
        }
        delete (result as Record<string, unknown>)[encryptedKey];
      }
    }
    return result;
  }

  /**
   * Create a new entity
   */
  async create(data: Omit<Entity, "id" | "createdAt" | "updatedAt">): Promise<Entity> {
    this.checkEncryption();
    const db = await this.getDb();

    const now = new Date().toISOString();
    const entityData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    } as unknown as Record<string, unknown>;

    const encrypted = await this.encryptFields(entityData);

    const id = await db.add(
      this.storeName,
      encrypted as JusticeCompanionDB[StoreName]["value"]
    );

    return this.findById(id as number) as Promise<Entity>;
  }

  /**
   * Find entity by ID
   */
  async findById(id: number): Promise<Entity | null> {
    const db = await this.getDb();
    const data = await db.get(this.storeName, id as JusticeCompanionDB[StoreName]["key"]);

    if (!data) {
      return null;
    }

    const decrypted = await this.decryptFields(data as Record<string, unknown>);
    return decrypted as Entity;
  }

  /**
   * Find all entities
   */
  async findAll(): Promise<Entity[]> {
    const db = await this.getDb();
    const data = await db.getAll(this.storeName);

    const results: Entity[] = [];
    for (const item of data) {
      const decrypted = await this.decryptFields(item as Record<string, unknown>);
      results.push(decrypted as Entity);
    }

    return results;
  }

  /**
   * Update an entity
   */
  async update(id: number, data: Partial<Omit<Entity, "id" | "createdAt">>): Promise<Entity | null> {
    this.checkEncryption();
    const db = await this.getDb();

    const existing = await db.get(this.storeName, id as JusticeCompanionDB[StoreName]["key"]);
    if (!existing) {
      return null;
    }

    const updated = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    } as unknown as Record<string, unknown>;

    const encrypted = await this.encryptFields(updated);

    await db.put(
      this.storeName,
      encrypted as JusticeCompanionDB[StoreName]["value"]
    );

    return this.findById(id);
  }

  /**
   * Delete an entity
   */
  async delete(id: number): Promise<boolean> {
    const db = await this.getDb();

    const existing = await db.get(this.storeName, id as JusticeCompanionDB[StoreName]["key"]);
    if (!existing) {
      return false;
    }

    await db.delete(this.storeName, id as JusticeCompanionDB[StoreName]["key"]);
    return true;
  }

  /**
   * Count all entities
   */
  async count(): Promise<number> {
    const db = await this.getDb();
    return db.count(this.storeName);
  }

  /**
   * Clear all entities (use with caution!)
   */
  async clear(): Promise<void> {
    const db = await this.getDb();
    await db.clear(this.storeName);
  }
}

/**
 * Capitalize first letter of a string
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
