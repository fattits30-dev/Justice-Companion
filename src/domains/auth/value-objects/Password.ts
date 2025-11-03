/**
 * Password Value Object
 * Encapsulates password validation rules
 */
export class Password {
  private static readonly MIN_LENGTH = 12; // OWASP recommendation
  private static readonly MAX_LENGTH = 128;
  private static readonly LOWERCASE_REGEX = /[a-z]/;
  private static readonly UPPERCASE_REGEX = /[A-Z]/;
  private static readonly NUMBER_REGEX = /[0-9]/;
  private static readonly SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

  private constructor(private readonly value: string) {}

  static create(password: string): Password {
    if (!password) {
      throw new Error('Password cannot be empty');
    }

    if (password.length < Password.MIN_LENGTH) {
      throw new Error(`Password must be at least ${Password.MIN_LENGTH} characters long`);
    }

    if (password.length > Password.MAX_LENGTH) {
      throw new Error(`Password cannot exceed ${Password.MAX_LENGTH} characters`);
    }

    const errors: string[] = [];

    if (!Password.LOWERCASE_REGEX.test(password)) {
      errors.push('at least one lowercase letter');
    }

    if (!Password.UPPERCASE_REGEX.test(password)) {
      errors.push('at least one uppercase letter');
    }

    if (!Password.NUMBER_REGEX.test(password)) {
      errors.push('at least one number');
    }

    if (!Password.SPECIAL_CHAR_REGEX.test(password)) {
      errors.push('at least one special character');
    }

    if (errors.length > 0) {
      throw new Error(`Password must contain ${errors.join(', ')}`);
    }

    // Check for common weak patterns
    if (Password.hasWeakPatterns(password)) {
      throw new Error('Password contains weak patterns. Please choose a stronger password');
    }

    return new Password(password);
  }

  private static hasWeakPatterns(password: string): boolean {
    const lower = password.toLowerCase();

    // Check for common weak passwords
    const weakPasswords = [
      'password123',
      'admin123',
      'qwerty123',
      'letmein123',
      'welcome123',
      'monkey123',
      'dragon123'
    ];

    for (const weak of weakPasswords) {
      if (lower.includes(weak.substring(0, 8))) {
        return true;
      }
    }

    // Check for sequences
    const sequences = ['123456', 'abcdef', 'qwerty'];
    for (const seq of sequences) {
      if (lower.includes(seq)) {
        return true;
      }
    }

    // Check for repeated characters (e.g., 'aaa', '111')
    const repeatedChars = /(.)\1{2,}/;
    if (repeatedChars.test(password)) {
      return true;
    }

    return false;
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    // Never expose the actual password in string representation
    return '[PROTECTED]';
  }

  equals(other: Password): boolean {
    return this.value === other.value;
  }

  getStrength(): 'weak' | 'medium' | 'strong' | 'very_strong' {
    let score = 0;

    // Length scoring
    if (this.value.length >= 16) {score += 2;}
    else if (this.value.length >= 12) {score += 1;}

    // Complexity scoring
    if (Password.LOWERCASE_REGEX.test(this.value)) {score += 1;}
    if (Password.UPPERCASE_REGEX.test(this.value)) {score += 1;}
    if (Password.NUMBER_REGEX.test(this.value)) {score += 1;}
    if (Password.SPECIAL_CHAR_REGEX.test(this.value)) {score += 2;}

    // Entropy estimation
    const uniqueChars = new Set(this.value.split('')).size;
    if (uniqueChars >= 10) {score += 1;}
    if (uniqueChars >= 15) {score += 1;}

    if (score >= 8) {return 'very_strong';}
    if (score >= 6) {return 'strong';}
    if (score >= 4) {return 'medium';}
    return 'weak';
  }
}