/**
 * ResearchPerformed Domain Event
 * Fired when legal research is performed for a case
 */
export class ResearchPerformed {
  public readonly eventType = 'research.performed' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly researchId: string,
    public readonly caseId: number,
    public readonly userId: number,
    public readonly query: string,
    public readonly searchType: 'legislation' | 'caselaw' | 'combined',
    public readonly metadata?: {
      resultsCount?: number;
      sources?: string[];
      executionTime?: number;
      model?: string;
      relevantCitations?: string[];
      issueTags?: string[];
    }
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Get event payload for serialization
   */
  getPayload() {
    return {
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      researchId: this.researchId,
      caseId: this.caseId,
      userId: this.userId,
      query: this.query,
      searchType: this.searchType,
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
    return `research-${this.researchId}`;
  }

  /**
   * Get related case aggregate ID
   */
  getCaseAggregateId(): string {
    return `case-${this.caseId}`;
  }

  /**
   * Check if research found relevant results
   */
  hasResults(): boolean {
    return (this.metadata?.resultsCount || 0) > 0;
  }

  /**
   * Check if research used AI
   */
  usedAI(): boolean {
    return !!this.metadata?.model;
  }

  /**
   * Get execution time in milliseconds
   */
  getExecutionTime(): number {
    return this.metadata?.executionTime || 0;
  }
}