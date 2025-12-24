/**
 * Cases Repository - Local IndexedDB Storage
 *
 * Handles CRUD operations for legal cases stored locally.
 */

import { /* openDatabase */ } from "../db";
import { BaseRepository, type BaseEntity } from "./BaseRepository";

/**
 * Case status options
 */
export type CaseStatus = "active" | "closed" | "pending";

/**
 * Case type options (UK civil law categories)
 */
export type CaseType =
  | "employment"
  | "housing"
  | "consumer"
  | "family"
  | "debt"
  | "other";

/**
 * Case entity interface
 */
export interface LocalCase extends BaseEntity {
  id: number;
  title: string;
  description: string | null;
  caseType: CaseType;
  status: CaseStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new case
 */
export interface CreateCaseInput {
  title: string;
  description?: string | null;
  caseType: CaseType;
  status?: CaseStatus;
}

/**
 * Input for updating a case
 */
export interface UpdateCaseInput {
  title?: string;
  description?: string | null;
  caseType?: CaseType;
  status?: CaseStatus;
}

/**
 * Cases repository for local storage
 */
export class CasesRepository extends BaseRepository<"cases", LocalCase> {
  constructor() {
    super("cases", {
      // Description could contain sensitive info
      encryptedFields: ["description"],
    });
  }

  /**
   * Create a new case
   */
  async create(input: CreateCaseInput): Promise<LocalCase> {
    const data = {
      title: input.title,
      description: input.description ?? null,
      caseType: input.caseType,
      status: input.status ?? "active",
    };

    return super.create(data as Omit<LocalCase, "id" | "createdAt" | "updatedAt">);
  }

  /**
   * Find cases by status
   */
  async findByStatus(status: CaseStatus): Promise<LocalCase[]> {
    const db = await this.getDb();
    const results = await db.getAllFromIndex("cases", "by-status", status);

    const decrypted: LocalCase[] = [];
    for (const item of results) {
      const dec = await this.decryptFields(item as unknown as Record<string, unknown>);
      decrypted.push(dec as unknown as LocalCase);
    }

    return decrypted;
  }

  /**
   * Find cases by type
   */
  async findByType(caseType: CaseType): Promise<LocalCase[]> {
    const db = await this.getDb();
    const results = await db.getAllFromIndex("cases", "by-type", caseType);

    const decrypted: LocalCase[] = [];
    for (const item of results) {
      const dec = await this.decryptFields(item as unknown as Record<string, unknown>);
      decrypted.push(dec as unknown as LocalCase);
    }

    return decrypted;
  }

  /**
   * Find all active cases
   */
  async findActive(): Promise<LocalCase[]> {
    return this.findByStatus("active");
  }

  /**
   * Find recent cases (sorted by updatedAt descending)
   */
  async findRecent(limit: number = 10): Promise<LocalCase[]> {
    const all = await this.findAll();

    // Sort by updatedAt descending
    all.sort((a, b) => {
      const dateA = new Date(a.updatedAt).getTime();
      const dateB = new Date(b.updatedAt).getTime();
      return dateB - dateA;
    });

    return all.slice(0, limit);
  }

  /**
   * Search cases by title (case-insensitive)
   */
  async searchByTitle(query: string): Promise<LocalCase[]> {
    const all = await this.findAll();
    const lowerQuery = query.toLowerCase();

    return all.filter((c) => c.title.toLowerCase().includes(lowerQuery));
  }

  /**
   * Get case statistics
   */
  async getStats(): Promise<{
    total: number;
    byStatus: Record<CaseStatus, number>;
    byType: Record<CaseType, number>;
  }> {
    const all = await this.findAll();

    const byStatus: Record<CaseStatus, number> = {
      active: 0,
      closed: 0,
      pending: 0,
    };

    const byType: Record<CaseType, number> = {
      employment: 0,
      housing: 0,
      consumer: 0,
      family: 0,
      debt: 0,
      other: 0,
    };

    for (const c of all) {
      byStatus[c.status]++;
      byType[c.caseType]++;
    }

    return {
      total: all.length,
      byStatus,
      byType,
    };
  }

  /**
   * Close a case
   */
  async close(id: number): Promise<LocalCase | null> {
    return this.update(id, { status: "closed" });
  }

  /**
   * Reopen a case
   */
  async reopen(id: number): Promise<LocalCase | null> {
    return this.update(id, { status: "active" });
  }
}

/**
 * Singleton instance
 */
let casesRepositoryInstance: CasesRepository | null = null;

export function getCasesRepository(): CasesRepository {
  if (!casesRepositoryInstance) {
    casesRepositoryInstance = new CasesRepository();
  }
  return casesRepositoryInstance;
}
