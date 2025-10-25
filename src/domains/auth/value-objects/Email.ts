/**
 * Email Value Object
 * Encapsulates email validation and formatting
 */
export class Email {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static readonly MAX_LENGTH = 255;

  private constructor(private readonly value: string) {}

  static create(email: string): Email {
    const trimmed = email.trim().toLowerCase();

    if (!trimmed) {
      throw new Error('Email cannot be empty');
    }

    if (trimmed.length > Email.MAX_LENGTH) {
      throw new Error(`Email cannot exceed ${Email.MAX_LENGTH} characters`);
    }

    if (!Email.EMAIL_REGEX.test(trimmed)) {
      throw new Error('Invalid email format');
    }

    // Additional validation for common typos
    if (trimmed.includes('..') || trimmed.startsWith('.') || trimmed.endsWith('.')) {
      throw new Error('Invalid email format: contains invalid dot placement');
    }

    return new Email(trimmed);
  }

  getValue(): string {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: Email): boolean {
    return this.value === other.value;
  }

  getDomain(): string {
    return this.value.split('@')[1];
  }

  getLocalPart(): string {
    return this.value.split('@')[0];
  }

  isBusinessEmail(): boolean {
    const commonPersonalDomains = [
      'gmail.com',
      'yahoo.com',
      'hotmail.com',
      'outlook.com',
      'live.com',
      'icloud.com',
      'me.com',
      'aol.com',
      'protonmail.com',
      'zoho.com'
    ];
    return !commonPersonalDomains.includes(this.getDomain());
  }

  getMasked(): string {
    const [localPart, domain] = this.value.split('@');
    if (localPart.length <= 3) {
      return '***@' + domain;
    }
    const visibleChars = Math.min(3, Math.floor(localPart.length / 3));
    const masked = localPart.substring(0, visibleChars) + '***';
    return masked + '@' + domain;
  }
}