/// <reference types="vitest/globals" />
/**
 * Password Validation Utilities Tests
 *
 * Tests for password validation functions following OWASP best practices.
 */

import {
  generatePasswordOfLength,
  generatePasswordWithoutDigits,
  generatePasswordWithoutLowercase,
  generatePasswordWithoutUppercase,
  generateStrongTestPassword,
} from "../test-utils/passwords";
import { randomUUID } from "node:crypto";

import { validatePasswordChange } from "./passwordValidation";

describe("validatePasswordChange", () => {
  const validOldPassword = generateStrongTestPassword();
  const validNewPassword = generateStrongTestPassword();
  const shortPassword = generatePasswordOfLength(8);
  const noUppercasePassword = generatePasswordWithoutUppercase();
  const noLowercasePassword = generatePasswordWithoutLowercase();
  const noDigitPassword = generatePasswordWithoutDigits();
  const twelveCharacterPassword = generatePasswordOfLength(12);
  const specialCharacterPassword = generateStrongTestPassword();
  const veryLongPassword = generatePasswordOfLength(48);
  const mismatchedPassword = `Mismatch-${randomUUID()}!Aa1`; // Must be different from validNewPassword

  it("should return error when old password is empty", () => {
    const result = validatePasswordChange(
      "",
      validNewPassword,
      validNewPassword,
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Current password is required");
  });

  it("should return error when new password is too short", () => {
    const result = validatePasswordChange(
      validOldPassword,
      shortPassword,
      shortPassword,
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("New password must be at least 12 characters");
  });

  it("should return error when new password lacks uppercase letter", () => {
    const result = validatePasswordChange(
      validOldPassword,
      noUppercasePassword,
      noUppercasePassword,
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "Password must contain at least one uppercase letter",
    );
  });

  it("should return error when new password lacks lowercase letter", () => {
    const result = validatePasswordChange(
      validOldPassword,
      noLowercasePassword,
      noLowercasePassword,
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe(
      "Password must contain at least one lowercase letter",
    );
  });

  it("should return error when new password lacks number", () => {
    const result = validatePasswordChange(
      validOldPassword,
      noDigitPassword,
      noDigitPassword,
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Password must contain at least one number");
  });

  it("should return error when passwords do not match", () => {
    const result = validatePasswordChange(
      validOldPassword,
      validNewPassword,
      mismatchedPassword,
    );

    expect(result.isValid).toBe(false);
    expect(result.error).toBe("New passwords do not match");
  });

  it("should return valid for password meeting all requirements", () => {
    const result = validatePasswordChange(
      validOldPassword,
      validNewPassword,
      validNewPassword,
    );

    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("should validate password with exactly 12 characters", () => {
    const result = validatePasswordChange(
      validOldPassword,
      twelveCharacterPassword,
      twelveCharacterPassword,
    );

    expect(result.isValid).toBe(true);
  });

  it("should validate password with special characters", () => {
    const result = validatePasswordChange(
      validOldPassword,
      specialCharacterPassword,
      specialCharacterPassword,
    );

    expect(result.isValid).toBe(true);
  });

  it("should validate very long password", () => {
    const result = validatePasswordChange(
      validOldPassword,
      veryLongPassword,
      veryLongPassword,
    );

    expect(result.isValid).toBe(true);
  });
});
