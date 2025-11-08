/**
 * Validation Decorator for Repositories
 *
 * Adds input validation to repository operations using Zod schemas.
 * Ensures data integrity by validating inputs before they reach the database.
 */

import { injectable } from "inversify";
import { z } from "zod";
import { RepositoryDecorator } from "./RepositoryDecorator.ts";
import { ValidationError } from "../../errors/DomainErrors.ts";

/**
 * Schema configuration for repository methods
 */
export interface ValidationSchemas {
  create?: z.ZodSchema;
  update?: z.ZodSchema;
  findById?: z.ZodSchema;
  findByUserId?: z.ZodSchema;
  delete?: z.ZodSchema;
  [key: string]: z.ZodSchema | undefined;
}

/**
 * Adds input validation to repository operations
 * Uses Zod schemas for runtime type checking
 *
 * Features:
 * - Validates inputs before database operations
 * - Type-safe validation with Zod
 * - Detailed error messages with field-level information
 * - Configurable schemas per method
 *
 * @template T The type of repository being decorated
 */
@injectable()
export class ValidationDecorator<T> extends RepositoryDecorator<T> {
  constructor(
    repository: T,
    private schemas: ValidationSchemas = {}
  ) {
    super(repository);
  }

  /**
   * Validate and create entity
   */
  async create(
    input: ValidationSchemas["create"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["create"]>
      : any
  ): Promise<
    ValidationSchemas["create"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["create"]>
      : any
  > {
    if (this.schemas.create) {
      const validated = this.validate(this.schemas.create, input, "create");
      return await this.forwardCall("create", validated);
    }
    return await this.forwardCall("create", input);
  }

  /**
   * Batch create with validation
   */
  async createBatch(
    items: ValidationSchemas["create"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["create"]>[]
      : any[]
  ): Promise<
    ValidationSchemas["create"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["create"]>[]
      : any[]
  > {
    // Validate all items first
    const validatedItems: any[] = [];
    for (let i = 0; i < items.length; i++) {
      if (this.schemas.create) {
        const validated = this.validate(
          this.schemas.create,
          items[i],
          `createBatch[${i}]`
        );
        validatedItems.push(validated);
      } else {
        validatedItems.push(items[i]);
      }
    }

    // Create all items
    const results: any[] = [];
    for (const item of validatedItems) {
      const result = await this.forwardCall("create", item);
      results.push(result);
    }

    return results;
  }

  /**
   * Validate and update entity
   */
  async update(
    id: number,
    input: ValidationSchemas["update"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["update"]>
      : any
  ): Promise<
    ValidationSchemas["update"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["update"]>
      : any
  > {
    // Validate ID
    this.validateId(id, "update");

    if (this.schemas.update) {
      const validated = this.validate(this.schemas.update, input, "update");
      return await this.forwardCall("update", id, validated);
    }
    return await this.forwardCall("update", id, input);
  }

  /**
   * Validate ID and find entity
   */
  async findById(
    id: number
  ): Promise<
    ValidationSchemas["findById"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["findById"]>
      : any
  > {
    this.validateId(id, "findById");

    if (this.schemas.findById) {
      this.validate(this.schemas.findById, id, "findById");
    }

    return await this.forwardCall("findById", id);
  }

  /**
   * Validate user ID and find entities
   */
  async findByUserId(
    userId: number
  ): Promise<
    ValidationSchemas["findByUserId"] extends z.ZodSchema
      ? z.infer<ValidationSchemas["findByUserId"]>
      : any
  > {
    this.validateId(userId, "findByUserId");

    if (this.schemas.findByUserId) {
      this.validate(this.schemas.findByUserId, userId, "findByUserId");
    }

    return await this.forwardCall("findByUserId", userId);
  }

  /**
   * Validate ID and delete entity
   */
  async delete(id: number): Promise<void> {
    this.validateId(id, "delete");

    if (this.schemas.delete) {
      this.validate(this.schemas.delete, id, "delete");
    }

    return await this.forwardCall("delete", id);
  }

  /**
   * Batch delete with ID validation
   */
  async deleteBatch(ids: number[]): Promise<number> {
    // Validate all IDs first
    for (const id of ids) {
      this.validateId(id, "deleteBatch");
    }

    // Perform batch deletion
    let deleteCount = 0;
    for (const id of ids) {
      await this.forwardCall("delete", id);
      deleteCount++;
    }

    return deleteCount;
  }

  /**
   * Set schema for a specific method dynamically
   */
  setSchema(methodName: string, schema: z.ZodSchema): void {
    this.schemas[methodName] = schema;
  }

  /**
   * Get schema for a specific method
   */
  getSchema(methodName: string): z.ZodSchema | undefined {
    return this.schemas[methodName];
  }

  /**
   * Validate input against schema
   */
  private validate<T extends z.ZodSchema>(
    schema: T,
    input: z.infer<T>,
    operation: string
  ): z.infer<T> {
    try {
      return schema.parse(input);
    } catch (error) {
      // Extract detailed validation errors from ZodError
      if (error instanceof z.ZodError) {
        const validationErrors = error.issues.map((issue) => ({
          field: issue.path.join(".") || "unknown",
          message: issue.message,
        }));

        throw new ValidationError(
          operation,
          `Validation failed: ${error.issues.map((i) => i.message).join(", ")}`,
          validationErrors
        );
      }

      // Fallback for non-Zod errors
      throw new ValidationError(
        operation,
        `Validation failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Validate ID is a positive integer
   */
  private validateId(id: number, operation: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(operation, "ID must be a positive integer", [
        { field: "id", message: "ID must be a positive integer" },
      ]);
    }
  }
}
