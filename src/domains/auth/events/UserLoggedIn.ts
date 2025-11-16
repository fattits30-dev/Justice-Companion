/**
 * UserLoggedIn Domain Event
 * Fired when a user successfully logs into the system
 */
export class UserLoggedIn {
  public readonly eventType = "user.logged_in" as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly userId: number,
    public readonly sessionId: string,
    public readonly metadata?: {
      ipAddress?: string;
      userAgent?: string;
      loginMethod?: "password" | "social" | "sso";
      rememberMe?: boolean;
      location?: string;
    },
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Create a UserLoggedIn event from entities
   */
  static fromEntities(
    user: {
      id: number;
    },
    session: {
      id: string;
      ipAddress?: string | null;
      userAgent?: string | null;
      rememberMe?: boolean;
    },
  ): UserLoggedIn {
    return new UserLoggedIn(user.id, session.id, {
      ipAddress: session.ipAddress || undefined,
      userAgent: session.userAgent || undefined,
      loginMethod: "password",
      rememberMe: session.rememberMe,
    });
  }

  /**
   * Get event payload for serialization
   */
  getPayload() {
    return {
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      metadata: this.metadata,
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
   * Get session aggregate ID
   */
  getSessionAggregateId(): string {
    return `session-${this.sessionId}`;
  }

  /**
   * Check if login used remember me option
   */
  hasRememberMe(): boolean {
    return this.metadata?.rememberMe || false;
  }

  /**
   * Check if login is from a new device/location
   */
  isNewDevice(previousUserAgent?: string): boolean {
    if (!previousUserAgent || !this.metadata?.userAgent) {
      return true;
    }
    return previousUserAgent !== this.metadata.userAgent;
  }
}
