/**
 * Unit tests for ErrorHandlingDecorator
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorHandlingDecorator } from "./ErrorHandlingDecorator.ts";
import {
  RepositoryError,
  NotFoundError,
} from "../../errors/RepositoryErrors.ts";
import { DatabaseError } from "../../errors/DomainErrors.ts";
import { generateStrongTestPassword } from "@/test-utils/passwords.ts";

// Mock repository for testing
class MockRepository {
  constructor(public name = "MockRepository") {}

  async findById(id: number) {
    if (id === 999) {
      return null; // Not found
    }
    if (id === 666) {
      throw new Error("UNIQUE constraint failed");
    }
    if (id === 777) {
      throw new Error("FOREIGN KEY constraint failed");
    }
    if (id === 888) {
      const error: any = new Error("Database is locked");
      error.code = "SQLITE_BUSY";
      throw error;
    }
    return { id, name: `Entity ${id}` };
  }

  async create(input: any) {
    if (input.duplicate) {
      throw new Error("UNIQUE constraint failed: users.username");
    }
    if (input.invalid) {
      throw new TypeError("Cannot read property of undefined");
    }
    return { id: 1, ...input };
  }

  async update(id: number, input: any) {
    if (id === 999) {
      return false; // Not found
    }
    if (input.violation) {
      throw new Error("FOREIGN KEY constraint failed");
    }
    return { id, ...input };
  }

  async delete(id: number) {
    if (id === 999) {
      return false; // Not found
    }
    if (id === 777) {
      throw new Error(
        "FOREIGN KEY constraint failed: referenced by other records",
      );
    }
    return true;
  }
}

describe("ErrorHandlingDecorator", () => {
  let mockRepository: MockRepository;
  let decorator: any;

  beforeEach(() => {
    mockRepository = new MockRepository();
    decorator = new ErrorHandlingDecorator(mockRepository, {
      includeStackTrace: false,
      convertToRepositoryErrors: true,
    });
  });

  describe("NotFoundError handling", () => {
    it("should throw NotFoundError when findById returns null", async () => {
      await expect(decorator.findById(999)).rejects.toThrow(NotFoundError);
    });

    it("should throw NotFoundError when update returns false", async () => {
      await expect(decorator.update(999, { name: "Test" })).rejects.toThrow(
        NotFoundError,
      );
    });

    it("should throw NotFoundError when delete returns false", async () => {
      await expect(decorator.delete(999)).rejects.toThrow(NotFoundError);
    });
  });

  describe("UNIQUE constraint violations", () => {
    it("should convert UNIQUE constraint error to RepositoryError", async () => {
      try {
        await decorator.create({ duplicate: true });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        if (error instanceof RepositoryError) {
          expect(error.code).toBe("DUPLICATE_ENTRY");
          expect(error.statusCode).toBe(409);
        }
      }
    });

    it("should handle UNIQUE constraint in findById", async () => {
      try {
        await decorator.findById(666);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        if (error instanceof RepositoryError) {
          expect(error.code).toBe("DUPLICATE_ENTRY");
        }
      }
    });
  });

  describe("FOREIGN KEY constraint violations", () => {
    it("should convert FOREIGN KEY error to RepositoryError", async () => {
      try {
        await decorator.update(1, { violation: true });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        if (error instanceof RepositoryError) {
          expect(error.code).toBe("FOREIGN_KEY_VIOLATION");
          expect(error.statusCode).toBe(409);
        }
      }
    });

    it("should handle FOREIGN KEY in delete", async () => {
      try {
        await decorator.delete(777);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        if (error instanceof RepositoryError) {
          expect(error.code).toBe("FOREIGN_KEY_VIOLATION");
        }
      }
    });
  });

  describe("Database errors", () => {
    it("should convert database lock error to DatabaseError", async () => {
      try {
        await decorator.findById(888);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseError);
        if (error instanceof DatabaseError) {
          expect(error.message).toContain("temporarily locked");
        }
      }
    });
  });

  describe("Type errors", () => {
    it("should convert TypeError to INVALID_INPUT RepositoryError", async () => {
      try {
        await decorator.create({ invalid: true });
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        if (error instanceof RepositoryError) {
          expect(error.code).toBe("INVALID_INPUT");
          expect(error.statusCode).toBe(400);
        }
      }
    });
  });

  describe("Generic errors", () => {
    it("should wrap unknown errors as RepositoryError", async () => {
      vi.spyOn(mockRepository, "findById").mockRejectedValueOnce(
        new Error("Unknown error"),
      );

      try {
        await decorator.findById(1);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(RepositoryError);
        if (error instanceof RepositoryError) {
          expect(error.code).toBe("REPOSITORY_ERROR");
          expect(error.statusCode).toBe(500);
        }
      }
    });
  });

  describe("Error context", () => {
    it("should include operation context in errors", async () => {
      try {
        await decorator.create({ duplicate: true });
        expect.fail("Should have thrown");
      } catch (error) {
        if (error instanceof RepositoryError) {
          expect(error.context).toBeDefined();
          expect(error.context?.input).toBeDefined();
          // Password should be sanitized
          expect(error.context?.input).not.toContain("password");
        }
      }
    });

    it("should sanitize sensitive fields", async () => {
      const sensitivePassword = generateStrongTestPassword();
      const sensitiveInput = {
        name: "Test",
        password: sensitivePassword,
        apiKey: "key-123",
        token: "tok-456",
        duplicate: true,
      };

      try {
        await decorator.create(sensitiveInput);
        expect.fail("Should have thrown");
      } catch (error) {
        if (
          error instanceof RepositoryError &&
          error.context?.input &&
          typeof error.context.input === "object" &&
          error.context.input !== null
        ) {
          const input = error.context.input as Record<string, unknown>;
          expect(input.password).toBe("[REDACTED]");
          expect(input.apiKey).toBe("[REDACTED]");
          expect(input.token).toBe("[REDACTED]");
          expect(input.name).toBe("Test");
        }
      }
    });
  });

  describe("Options", () => {
    it("should include stack trace when enabled", async () => {
      const decoratorWithStack = new ErrorHandlingDecorator(mockRepository, {
        includeStackTrace: true,
        convertToRepositoryErrors: true,
      });

      vi.spyOn(mockRepository, "findById").mockRejectedValueOnce(
        new Error("Test error"),
      );

      try {
        await decoratorWithStack.findById(1);
        expect.fail("Should have thrown");
      } catch (error) {
        if (error instanceof RepositoryError) {
          expect(error.context?.stackTrace).toBeDefined();
        }
      }
    });

    it("should not convert errors when disabled", async () => {
      const decoratorNoConvert = new ErrorHandlingDecorator(mockRepository, {
        convertToRepositoryErrors: false,
      });

      const originalError = new Error("Original error");
      vi.spyOn(mockRepository, "findById").mockRejectedValueOnce(originalError);

      try {
        await decoratorNoConvert.findById(1);
        expect.fail("Should have thrown");
      } catch (error) {
        expect(error).toBe(originalError);
        expect(error).not.toBeInstanceOf(RepositoryError);
      }
    });
  });

  describe("Entity type extraction", () => {
    it("should extract entity type from repository name", async () => {
      // The repository name comes from constructor.name, not a property
      // MockRepository becomes 'mock' after removing 'Repository' suffix
      const dec = new ErrorHandlingDecorator(mockRepository);

      try {
        await dec.findById(999);
        expect.fail("Should have thrown");
      } catch (error) {
        if (error instanceof NotFoundError) {
          // MockRepository -> mock (after removing 'Repository' suffix)
          expect(error.message.toLowerCase()).toContain("mock");
        }
      }
    });
  });
});
