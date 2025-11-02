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
  async create(input: z.infer<ValidationSchemas['create']>): Promise<z.infer<ValidationSchemas['create']>> {
    if (this.schemas.create) {
      const validated = this.validate(this.schemas.create, input, 'create');
      return await this.repository.create(validated);
    }
    return await this.repository.create(input);
  }

  /**
   * Validate and update entity
   */
  async update(id: number, input: z.infer<ValidationSchemas['update']>): Promise<z.infer<ValidationSchemas['update']>> {
    // Validate ID
    this.validateId(id, 'update');

    if (this.schemas.update) {
      const validated = this.validate(this.schemas.update, input, 'update');
      return await this.repository.update(id, validated);
    }
    return await this.repository.update(id, input);
  }

  /**
   * Validate ID and find entity
   */
  async findById(id: number): Promise<z.infer<ValidationSchemas['findById']>> {
    this.validateId(id, 'findById');

    if (this.schemas.findById) {
      this.validate(this.schemas.findById, id, 'findById');
    }

    return await this.repository.findById(id);
  }

  /**
   * Validate user ID and find entities
   */
  async findByUserId(userId: number): Promise<z.infer<ValidationSchemas['findByUserId']>> {
    this.validateId(userId, 'findByUserId');

    if (this.schemas.findByUserId) {
      this.validate(this.schemas.findByUserId, userId, 'findByUserId');
    }

    return await this.repository.findByUserId(userId);
  }

  /**
   * Validate ID and delete entity
   */
  async delete(id: number): Promise<void> {
    this.validateId(id, 'delete');

    if (this.schemas.delete) {
      this.validate(this.schemas.delete, id, 'delete');
    }

    return await this.repository.delete(id);
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
      throw new ValidationError(`Validation failed for ${operation}: ${(error as Error).message}`);
    }
  }

  /**
   * Validate ID is a positive integer
   */
  private validateId(id: number, operation: string): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError(`Invalid ID for ${operation}: ID must be a positive integer`);
    }
  }
}