/**
 * Unit tests for ValidationDecorator
 */

import { describe, it, expect, beforeEach } from "vitest";
import { z } from "zod";
import { ValidationDecorator } from "./ValidationDecorator.ts";
import { ValidationError } from "../../errors/DomainErrors.ts";
import {
  generateTestDisplayName,
  generateTestEmail,
} from "@/test-utils/identities.ts";

// Mock repository for testing
class MockRepository {
  async findById(id: number) {
    return { id, name: `Entity ${id}` };
  }

  async create(input: any) {
    return { id: 1, ...input };
  }

  async update(id: number, input: any) {
    return { id, ...input };
  }

  async delete(_id: number) {
    return true;
  }

  async findByUserId(userId: number) {
    return [{ id: 1, userId }];
  }

  async createBatch(items: any[]) {
    return items.map((item, index) => ({ id: index + 1, ...item }));
  }

  async deleteBatch(ids: number[]) {
    return ids.length;
  }
}

// Test schemas
const createSchema = z.object({
  name: z.string().min(1).max(100),
  age: z.number().int().positive().max(150),
  email: z.string().email().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  age: z.number().int().positive().max(150).optional(),
  email: z.string().email().optional(),
});

describe("ValidationDecorator", () => {
  let mockRepository: MockRepository;
  let decorator: any;

  beforeEach(() => {
    mockRepository = new MockRepository();
    decorator = new ValidationDecorator(mockRepository, {
      create: createSchema,
      update: updateSchema,
    });
  });

  describe("create validation", () => {
    it("should accept valid input", async () => {
      const name = generateTestDisplayName();
      const email = generateTestEmail();
      const validInput = {
        name,
        age: 30,
        email,
      };

      const result = await decorator.create(validInput);
      expect(result).toEqual({ id: 1, ...validInput });
    });

    it("should reject invalid input", async () => {
      const invalidInput = {
        name: "", // Empty string
        age: -5, // Negative age
        email: "not-an-email", // Invalid email
      };

      await expect(decorator.create(invalidInput)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should reject missing required fields", async () => {
      const incompleteInput = {
        name: generateTestDisplayName(),
        // Missing required 'age' field
      };

      await expect(decorator.create(incompleteInput)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should handle optional fields", async () => {
      const inputWithoutEmail = {
        name: generateTestDisplayName(),
        age: 25,
        // Email is optional
      };

      const result = await decorator.create(inputWithoutEmail);
      expect(result).toEqual({ id: 1, ...inputWithoutEmail });
    });
  });

  describe("update validation", () => {
    it("should accept partial updates", async () => {
      const partialUpdate = {
        name: generateTestDisplayName("Updated"),
      };

      const result = await decorator.update(1, partialUpdate);
      expect(result).toEqual({ id: 1, ...partialUpdate });
    });

    it("should reject invalid partial updates", async () => {
      const invalidUpdate = {
        age: 200, // Exceeds max age
      };

      await expect(decorator.update(1, invalidUpdate)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should validate ID parameter", async () => {
      const validUpdate = { name: generateTestDisplayName("New") };

      // Invalid ID (negative)
      await expect(decorator.update(-1, validUpdate)).rejects.toThrow(
        ValidationError,
      );

      // Invalid ID (non-integer)
      await expect(decorator.update(1.5, validUpdate)).rejects.toThrow(
        ValidationError,
      );

      // Invalid ID (NaN)
      await expect(decorator.update(NaN, validUpdate)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("findById validation", () => {
    it("should accept valid ID", async () => {
      const result = await decorator.findById(1);
      expect(result).toEqual({ id: 1, name: "Entity 1" });
    });

    it("should reject invalid ID", async () => {
      await expect(decorator.findById(-1)).rejects.toThrow(ValidationError);
      await expect(decorator.findById(0)).rejects.toThrow(ValidationError);
      await expect(decorator.findById(Infinity)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("delete validation", () => {
    it("should validate ID before deletion", async () => {
      const result = await decorator.delete(1);
      expect(result).toBe(true);

      await expect(decorator.delete(-1)).rejects.toThrow(ValidationError);
    });
  });

  describe("batch operations", () => {
    it("should validate each item in batch creation", async () => {
      const validBatch = [
        { name: "Item 1", age: 20 },
        { name: "Item 2", age: 30 },
      ];

      const result = await decorator.createBatch(validBatch);
      expect(result).toHaveLength(2);
    });

    it("should reject batch with invalid items", async () => {
      const invalidBatch = [
        { name: "Valid Item", age: 20 },
        { name: "", age: -5 }, // Invalid item
      ];

      await expect(decorator.createBatch(invalidBatch)).rejects.toThrow(
        ValidationError,
      );
    });

    it("should validate all IDs in batch deletion", async () => {
      const validIds = [1, 2, 3];
      const result = await decorator.deleteBatch(validIds);
      expect(result).toBe(3);

      const invalidIds = [1, -1, 3]; // Contains invalid ID
      await expect(decorator.deleteBatch(invalidIds)).rejects.toThrow(
        ValidationError,
      );
    });
  });

  describe("schema management", () => {
    it("should allow setting schemas dynamically", () => {
      const newSchema = z.object({ field: z.string() });
      decorator.setSchema("customMethod", newSchema);
      expect(decorator.getSchema("customMethod")).toBe(newSchema);
    });

    it("should work without schemas", async () => {
      const decoratorWithoutSchemas = new ValidationDecorator(
        mockRepository,
        {},
      );
      const result = await decoratorWithoutSchemas.create({ any: "data" });
      expect(result).toEqual({ id: 1, any: "data" });
    });
  });

  describe("error messages", () => {
    it("should provide detailed validation errors", async () => {
      const invalidInput = {
        name: "x".repeat(101), // Exceeds max length
        age: "not a number" as any,
      };

      try {
        await decorator.create(invalidInput);
        expect.fail("Should have thrown ValidationError");
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.context?.validationErrors).toBeDefined();
          expect(error.context?.validationErrors).toBeInstanceOf(Array);
        }
      }
    });
  });
});
