/**
 * Test utilities for password generation and validation
 */

/**
 * Generate a strong test password that meets all validation requirements
 */
export function generateStrongTestPassword(): string {
  return "TestPassword123!@#";
}

/**
 * Generate a deterministic password for consistent testing
 */
export function generateDeterministicPassword(seed?: string): string {
  if (seed) {
    // Simple hash-like function for deterministic output based on seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      const char = seed.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `DeterministicPass${Math.abs(hash)}!`;
  }
  return "DeterministicPass123!";
}

/**
 * Generate a weak password for testing validation failures
 */
export function generateWeakTestPassword(): string {
  return "weak";
}

/**
 * Generate a password of specific length
 */
export function generatePasswordOfLength(length: number): string {
  return "A".repeat(length) + "1!a";
}

/**
 * Generate a password without digits
 */
export function generatePasswordWithoutDigits(): string {
  return "TestPassword!@#";
}

/**
 * Generate a password without lowercase letters
 */
export function generatePasswordWithoutLowercase(): string {
  return "TESTPASSWORD123!@#";
}

/**
 * Generate a password without uppercase letters
 */
export function generatePasswordWithoutUppercase(): string {
  return "testpassword123!@#";
}
