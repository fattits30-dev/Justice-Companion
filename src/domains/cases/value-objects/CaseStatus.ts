/**
 * CaseStatus Value Object
 * Encapsulates case status validation and business rules
 */
export class CaseStatus {
  private static readonly VALID_STATUSES = [
    "active",
    "closed",
    "pending",
  ] as const;

  private constructor(
    private readonly value: "active" | "closed" | "pending",
  ) {}

  static create(status: string): CaseStatus {
    if (!CaseStatus.VALID_STATUSES.includes(status as any)) {
      throw new Error(
        `Invalid case status: ${status}. Must be one of ${CaseStatus.VALID_STATUSES.join(", ")}`,
      );
    }
    return new CaseStatus(status as "active" | "closed" | "pending");
  }

  static active(): CaseStatus {
    return new CaseStatus("active");
  }

  static closed(): CaseStatus {
    return new CaseStatus("closed");
  }

  static pending(): CaseStatus {
    return new CaseStatus("pending");
  }

  getValue(): "active" | "closed" | "pending" {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: CaseStatus): boolean {
    return this.value === other.value;
  }

  isActive(): boolean {
    return this.value === "active";
  }

  isClosed(): boolean {
    return this.value === "closed";
  }

  isPending(): boolean {
    return this.value === "pending";
  }

  canTransitionTo(newStatus: CaseStatus): boolean {
    // Business rule: closed cases cannot be reopened
    if (this.isClosed()) {
      return false;
    }

    // Business rule: pending cases can go to active or closed
    if (this.isPending()) {
      return newStatus.isActive() || newStatus.isClosed();
    }

    // Business rule: active cases can only be closed
    if (this.isActive()) {
      return newStatus.isClosed();
    }

    return false;
  }
}
