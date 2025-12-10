/// <reference types="vitest/globals" />

import {
  DomainError,
  NotAuthenticatedError,
  InvalidCredentialsError,
  CaseNotFoundError,
  ValidationError,
  DatabaseError,
  AINotConfiguredError,
  GdprComplianceError,
  isDomainError,
  toDomainError,
  createErrorResponse,
} from "./DomainErrors";

describe("DomainErrors", () => {
  describe("Base DomainError", () => {
    it("creates error with correct properties", () => {
      const error = new DomainError("TEST_ERROR", "Test message", 400, {
        detail: "test",
      });

      expect(error.code).toBe("TEST_ERROR");
      expect(error.message).toBe("Test message");
      expect(error.statusCode).toBe(400);
      expect(error.context).toEqual({ detail: "test" });
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error.name).toBe("DomainError");
    });

    it("converts to JSON correctly", () => {
      const error = new DomainError("TEST_ERROR", "Test message", 500);
      const json = error.toJSON();

      expect(json.code).toBe("TEST_ERROR");
      expect(json.message).toBe("Test message");
      expect(json.statusCode).toBe(500);
      expect(json.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("Authentication Errors", () => {
    it("creates NotAuthenticatedError with 401 status", () => {
      const error = new NotAuthenticatedError();
      expect(error.code).toBe("NOT_AUTHENTICATED");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Authentication required");
    });

    it("creates InvalidCredentialsError with 401 status", () => {
      const error = new InvalidCredentialsError();
      expect(error.code).toBe("INVALID_CREDENTIALS");
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe("Invalid username or password");
    });
  });

  describe("Resource Errors", () => {
    it("creates CaseNotFoundError with case ID context", () => {
      const error = new CaseNotFoundError(123);
      expect(error.code).toBe("CASE_NOT_FOUND");
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe("Case with ID 123 not found");
      expect(error.context).toEqual({ caseId: 123 });
    });
  });

  describe("Validation Errors", () => {
    it("creates ValidationError with field information", () => {
      const error = new ValidationError("email", "Invalid email format");
      expect(error.code).toBe("VALIDATION_ERROR");
      expect(error.statusCode).toBe(400);
      expect(error.message).toBe(
        "Validation failed for email: Invalid email format",
      );
      expect(error.context?.field).toBe("email");
    });
  });

  describe("Database Errors", () => {
    it("creates DatabaseError with operation context", () => {
      const error = new DatabaseError("insert", "constraint violation");
      expect(error.code).toBe("DATABASE_ERROR");
      expect(error.statusCode).toBe(500);
      expect(error.message).toBe(
        "Database insert failed: constraint violation",
      );
      expect(error.context?.operation).toBe("insert");
    });
  });

  describe("AI Service Errors", () => {
    it("creates AINotConfiguredError", () => {
      const error = new AINotConfiguredError("OpenAI");
      expect(error.code).toBe("AI_NOT_CONFIGURED");
      expect(error.statusCode).toBe(503);
      expect(error.message).toBe(
        "OpenAI not configured. Please set your API key in Settings.",
      );
    });
  });

  describe("GDPR Compliance Errors", () => {
    it("creates GdprComplianceError with article information", () => {
      const error = new GdprComplianceError(
        17,
        "Right to erasure",
        "User consent required",
      );
      expect(error.code).toBe("GDPR_COMPLIANCE_ERROR");
      expect(error.statusCode).toBe(451);
      expect(error.message).toBe(
        "GDPR Article 17 - Right to erasure: User consent required",
      );
      expect(error.context).toEqual({
        article: 17,
        requirement: "Right to erasure",
      });
    });
  });

  describe("Utility Functions", () => {
    it("isDomainError identifies DomainError instances", () => {
      const domainError = new DomainError("TEST", "test");
      const regularError = new Error("test");

      expect(isDomainError(domainError)).toBe(true);
      expect(isDomainError(regularError)).toBe(false);
      expect(isDomainError("string")).toBe(false);
      expect(isDomainError(null)).toBe(false);
    });

    it("toDomainError converts regular errors", () => {
      const regularError = new Error("User not found");
      const converted = toDomainError(regularError);

      expect(converted).toBeInstanceOf(DomainError);
      expect(converted.code).toBe("NOT_FOUND");
      expect(converted.statusCode).toBe(404);
    });

    it("toDomainError preserves existing DomainErrors", () => {
      const domainError = new CaseNotFoundError(123);
      const converted = toDomainError(domainError);

      expect(converted).toBe(domainError);
    });

    it("toDomainError handles unknown error types", () => {
      const converted = toDomainError("string error");

      expect(converted.code).toBe("UNKNOWN_ERROR");
      expect(converted.statusCode).toBe(500);
      expect(converted.context?.originalError).toBe("string error");
    });

    it("createErrorResponse formats for IPC", () => {
      const error = new ValidationError("username", "Too short");
      const response = createErrorResponse(error);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe("VALIDATION_ERROR");
      expect(response.error?.message).toBe(
        "Validation failed for username: Too short",
      );
      expect(response.error?.statusCode).toBe(400);
      expect(response.error?.context?.field).toBe("username");
    });
  });
});
