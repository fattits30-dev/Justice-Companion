/**
 * Validation Decorator for Repositories
 *
 * Adds input validation to repository operations using Zod schemas.
 * Ensures data integrity by validating inputs before they reach the database.
 */

import { injectable } from 'inversify';
import { z } from 'zod';
import { RepositoryDecorator } from './RepositoryDecorator.ts';
import { ValidationError } from '../../errors/DomainErrors.ts';

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
  async create(input: any): Promise<any> {
    if (this.schemas.create) {
      const validated = this.validate(this.schemas.create, input, 'create');
      return await (this.repository as any).create(validated);
    }
    return await (this.repository as any).create(input);
  }

  /**
   * Validate and update entity
   */
  async update(id: number, input: any): Promise<any> {
    // Validate ID
    this.validateId(id, 'update');

    if (this.schemas.update) {
      const validated = this.validate(this.schemas.update, input, 'update');
      return await (this.repository as any).update(id, validated);
    }
    return await (this.repository as any).update(id, input);
  }

  /**
   * Validate ID and find entity
   */
  async findById(id: number): Promise<any> {
    this.validateId(id, 'findById');

    if (this.schemas.findById) {
      this.validate(this.schemas.findById, id, 'findById');
    }

    return await (this.repository as any).findById(id);
  }

  /**
   * Validate user ID and find entities
   */
  async findByUserId(userId: number): Promise<any[]> {
    if (!this.hasMethod('findByUserId')) {
      return this.forwardCall('findByUserId', userId);
    }

    this.validateId(userId, 'findByUserId');

    if (this.schemas.findByUserId) {
      this.validate(this.schemas.findByUserId, userId, 'findByUserId');
    }

    return await (this.repository as any).findByUserId(userId);
  }

  /**
   * Validate ID and delete entity
   */
  async delete(id: number): Promise<boolean> {
    this.validateId(id, 'delete');

    if (this.schemas.delete) {
      this.validate(this.schemas.delete, id, 'delete');
    }

    return await (this.repository as any).delete(id);
  }

  /**
   * Validate batch creation inputs
   */
  async createBatch(items: any[]): Promise<any[]> {
    if (!this.hasMethod('createBatch')) {
      return this.forwardCall('createBatch', items);
    }

    if (this.schemas.create) {
      // Validate each item in the batch
      const validated = items.map((item, index) =>
        this.validate(this.schemas.create!, item, `createBatch[${index}]`)
      );
      return await (this.repository as any).createBatch(validated);
    }

    return await (this.repository as any).createBatch(items);
  }

  /**
   * Validate batch deletion IDs
   */
  async deleteBatch(ids: number[]): Promise<number> {
    if (!this.hasMethod('deleteBatch')) {
      return this.forwardCall('deleteBatch', ids);
    }

    // Validate all IDs
    ids.forEach((id, index) => this.validateId(id, `deleteBatch[${index}]`));

    return await (this.repository as any).deleteBatch(ids);
  }

  /**
   * Validate data against a Zod schema
   *
   * @param schema The Zod schema to validate against
   * @param data The data to validate
   * @param operation The operation name for error messages
   * @returns The validated and parsed data
   * @throws ValidationError if validation fails
   */
  private validate<TSchema>(
    schema: z.ZodSchema<TSchema>,
    data: unknown,
    operation: string
  ): TSchema {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Convert Zod errors to our ValidationError format
        const validationErrors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        throw new ValidationError(
          operation,
          `Validation failed for ${operation}: ${error.errors[0]?.message}`,
          validationErrors
        );
      }
      throw error;
    }
  }

  /**
   * Validate ID parameter
   *
   * @param id The ID to validate
   * @param operation The operation name for error messages
   * @throws ValidationError if ID is invalid
   */
  private validateId(id: number, operation: string): void {
    const idSchema = z.number()
      .int('ID must be an integer')
      .positive('ID must be positive')
      .finite('ID must be finite');

    try {
      idSchema.parse(id);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new ValidationError(
          'id',
          `Invalid ID for ${operation}: ${error.errors[0]?.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Set or update validation schema for a method
   *
   * @param method The method name
   * @param schema The Zod schema for validation
   */
  public setSchema(method: string, schema: z.ZodSchema): void {
    this.schemas[method] = schema;
  }

  /**
   * Get validation schema for a method
   *
   * @param method The method name
   * @returns The schema or undefined if not set
   */
  public getSchema(method: string): z.ZodSchema | undefined {
    return this.schemas[method];
  }
}