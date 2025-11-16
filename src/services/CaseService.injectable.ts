/**
 * CaseService - Dependency Injection Version
 *
 * Business logic layer for case management.
 * This is the migrated version using InversifyJS decorators.
 */

import { injectable, inject } from "inversify";
import { TYPES } from "../shared/infrastructure/di/types.ts";
import type { IDatabase } from "../shared/infrastructure/di/interfaces.ts";
import type { ICaseRepository } from "../shared/infrastructure/di/repository-interfaces.ts";
import type {
  IAuditLogger,
  ICaseService,
} from "../shared/infrastructure/di/service-interfaces.ts";
import type {
  Case,
  CreateCaseInput,
  UpdateCaseInput,
} from "../domains/cases/entities/Case.ts";

interface CreateCaseWithUser extends CreateCaseInput {
  userId: number;
}

/**
 * CaseService implementation with dependency injection
 */
@injectable()
export class CaseServiceInjectable implements ICaseService {
  constructor(
    @inject(TYPES.CaseRepository) private caseRepository: ICaseRepository,
    @inject(TYPES.Database) private db: IDatabase,
    @inject(TYPES.AuditLogger) private auditLogger: IAuditLogger,
  ) {}

  /**
   * Create a new case for a user
   */
  createCase(input: CreateCaseWithUser): Case {
    const { userId, ...caseInput } = input;

    // Create the case using the repository
    const createdCase = this.caseRepository.create(caseInput);

    // Update the user_id field directly (temporary workaround)
    // Note: Repository should handle user association in future refactoring
    (this.db as any)
      .prepare("UPDATE cases SET user_id = ? WHERE id = ?")
      .run(userId, createdCase.id);

    // Fetch the complete case with user_id
    const persistedCase = this.caseRepository.findById(createdCase.id);
    if (!persistedCase) {
      throw new Error(`Failed to load case ${createdCase.id} after creation`);
    }

    // Log the case creation
    this.auditLogger.log({
      userId: userId.toString(),
      eventType: "case.create",
      resourceType: "case",
      resourceId: createdCase.id.toString(),
      action: "create",
      details: {
        title: createdCase.title,
        status: createdCase.status,
      },
    });

    return { ...persistedCase, userId };
  }

  /**
   * Get all cases
   */
  getAllCases(): Case[] {
    return this.caseRepository.findAll();
  }

  /**
   * Get a case by ID
   */
  getCaseById(id: number): Case | null {
    return this.caseRepository.findById(id);
  }

  /**
   * Update a case
   */
  updateCase(id: number, input: UpdateCaseInput, userId: number): Case | null {
    const updatedCase = this.caseRepository.update(id, input);

    if (updatedCase) {
      // Log the update
      this.auditLogger.log({
        userId: userId.toString(),
        eventType: "case.update",
        resourceType: "case",
        resourceId: id.toString(),
        action: "update",
        details: input as Record<string, unknown>,
      });
    }

    return updatedCase;
  }

  /**
   * Close a case
   */
  closeCase(id: number, userId: number): Case | null {
    const closedCase = this.caseRepository.update(id, { status: "closed" });

    if (closedCase) {
      // Log the closure
      this.auditLogger.log({
        userId: userId.toString(),
        eventType: "case.update",
        resourceType: "case",
        resourceId: id.toString(),
        action: "update",
        details: { status: "closed" },
      });
    }

    return closedCase;
  }

  /**
   * Delete a case
   */
  deleteCase(id: number, userId: number): boolean {
    const deleted = this.caseRepository.delete(id);

    if (deleted) {
      // Log the deletion
      this.auditLogger.log({
        userId: userId.toString(),
        eventType: "case.delete",
        resourceType: "case",
        resourceId: id.toString(),
        action: "delete",
        details: {},
      });
    }

    return deleted;
  }
}
