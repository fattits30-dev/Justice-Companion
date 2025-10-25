/**
 * EvidenceUploaded Domain Event
 * Fired when new evidence is uploaded to a case
 */
export class EvidenceUploaded {
  public readonly eventType = 'evidence.uploaded' as const;
  public readonly occurredAt: Date;

  constructor(
    public readonly evidenceId: number,
    public readonly caseId: number,
    public readonly userId: number,
    public readonly title: string,
    public readonly evidenceType: string,
    public readonly metadata?: {
      filePath?: string;
      fileSize?: number;
      mimeType?: string;
      obtainedDate?: string;
      uploadedBy?: string;
      source?: string;
    }
  ) {
    this.occurredAt = new Date();
  }

  /**
   * Create an EvidenceUploaded event from an Evidence entity
   */
  static fromEntity(evidence: {
    id: number;
    caseId: number;
    title: string;
    evidenceType: string;
    filePath?: string | null;
    obtainedDate?: string | null;
  }, userId: number): EvidenceUploaded {
    return new EvidenceUploaded(
      evidence.id,
      evidence.caseId,
      userId,
      evidence.title,
      evidence.evidenceType,
      {
        filePath: evidence.filePath || undefined,
        obtainedDate: evidence.obtainedDate || undefined
      }
    );
  }

  /**
   * Get event payload for serialization
   */
  getPayload() {
    return {
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      evidenceId: this.evidenceId,
      caseId: this.caseId,
      userId: this.userId,
      title: this.title,
      evidenceType: this.evidenceType,
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
    return `evidence-${this.evidenceId}`;
  }

  /**
   * Get related case aggregate ID
   */
  getCaseAggregateId(): string {
    return `case-${this.caseId}`;
  }

  /**
   * Check if evidence has a file attached
   */
  hasFile(): boolean {
    return !!this.metadata?.filePath;
  }
}