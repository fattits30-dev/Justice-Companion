/**
 * UserRegistered Domain Event
 * Fired when a new user registers in the system
 */
export class UserRegistered {
  public readonly eventType = 'user.registered' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly userId: number,
    public readonly username: string,
    public readonly email: string,
    public readonly role: 'user' | 'admin',
    public readonly metadata?: {
      registrationSource?: string;
      ipAddress?: string;
      userAgent?: string;
      referrer?: string;
    }
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Create a UserRegistered event from a User entity
   */
  static fromEntity(user: {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
  }, metadata?: {
    ipAddress?: string;
    userAgent?: string;
  }): UserRegistered {
    return new UserRegistered(
      user.id,
      user.username,
      user.email,
      user.role,
      metadata
    );
  }

  /**
   * Get event payload for serialization
   */
  getPayload() {
    return {
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      userId: this.userId,
      username: this.username,
      email: this.email,
      role: this.role,
      metadata: this.metadata
    };
  }

  /**
   * Get event name for event bus routing
   */
  getEventName(): string {
    return this.eventType;
  }

  /**
   * Get aggregate ID for event sourcing
   */
  getAggregateId(): string {
    return `user-${this.userId}`;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.role === 'admin';
  }

  /**
   * Get masked email for logging
   */
  getMaskedEmail(): string {
    const [localPart, domain] = this.email.split('@');
    if (localPart.length <= 3) {
      return '***@' + domain;
    }
    const visibleChars = Math.min(3, Math.floor(localPart.length / 3));
    const masked = localPart.substring(0, visibleChars) + '***';
    return masked + '@' + domain;
  }
}