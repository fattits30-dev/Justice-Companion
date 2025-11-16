/**
 * CaseType Value Object
 * Encapsulates case type validation and business rules
 */
export class CaseType {
  private static readonly VALID_TYPES = [
    "employment",
    "housing",
    "consumer",
    "family",
    "debt",
    "other",
  ] as const;

  private constructor(
    private readonly value:
      | "employment"
      | "housing"
      | "consumer"
      | "family"
      | "debt"
      | "other",
  ) {}

  static create(type: string): CaseType {
    if (!CaseType.VALID_TYPES.includes(type as any)) {
      throw new Error(
        `Invalid case type: ${type}. Must be one of ${CaseType.VALID_TYPES.join(", ")}`,
      );
    }
    return new CaseType(
      type as
        | "employment"
        | "housing"
        | "consumer"
        | "family"
        | "debt"
        | "other",
    );
  }

  static employment(): CaseType {
    return new CaseType("employment");
  }

  static housing(): CaseType {
    return new CaseType("housing");
  }

  static consumer(): CaseType {
    return new CaseType("consumer");
  }

  static family(): CaseType {
    return new CaseType("family");
  }

  static debt(): CaseType {
    return new CaseType("debt");
  }

  static other(): CaseType {
    return new CaseType("other");
  }

  getValue():
    | "employment"
    | "housing"
    | "consumer"
    | "family"
    | "debt"
    | "other" {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: CaseType): boolean {
    return this.value === other.value;
  }

  getDisplayName(): string {
    const displayNames: Record<typeof this.value, string> = {
      employment: "Employment",
      housing: "Housing",
      consumer: "Consumer Rights",
      family: "Family",
      debt: "Debt",
      other: "Other",
    };
    return displayNames[this.value];
  }

  getStatutoryLimitations(): number {
    // Return statutory limitation period in days for each case type (UK law)
    const limitations: Record<typeof this.value, number> = {
      employment: 90, // 3 months for employment tribunal
      housing: 365, // 1 year for housing disputes
      consumer: 2190, // 6 years for consumer claims
      family: 365, // 1 year for most family proceedings
      debt: 2190, // 6 years for debt recovery
      other: 2190, // Default to 6 years
    };
    return limitations[this.value];
  }
}
