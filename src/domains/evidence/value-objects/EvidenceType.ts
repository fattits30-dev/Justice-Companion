/**
 * EvidenceType Value Object
 * Encapsulates evidence type validation and business rules
 */
export class EvidenceType {
  private static readonly VALID_TYPES = [
    'document',
    'photo',
    'email',
    'recording',
    'note',
    'witness'
  ] as const;

  private constructor(
    private readonly value: 'document' | 'photo' | 'email' | 'recording' | 'note' | 'witness'
  ) {}

  static create(type: string): EvidenceType {
    if (!EvidenceType.VALID_TYPES.includes(type as any)) {
      throw new Error(`Invalid evidence type: ${type}. Must be one of ${EvidenceType.VALID_TYPES.join(', ')}`);
    }
    return new EvidenceType(type as 'document' | 'photo' | 'email' | 'recording' | 'note' | 'witness');
  }

  static document(): EvidenceType {
    return new EvidenceType('document');
  }

  static photo(): EvidenceType {
    return new EvidenceType('photo');
  }

  static email(): EvidenceType {
    return new EvidenceType('email');
  }

  static recording(): EvidenceType {
    return new EvidenceType('recording');
  }

  static note(): EvidenceType {
    return new EvidenceType('note');
  }

  static witness(): EvidenceType {
    return new EvidenceType('witness');
  }

  getValue(): 'document' | 'photo' | 'email' | 'recording' | 'note' | 'witness' {
    return this.value;
  }

  toString(): string {
    return this.value;
  }

  equals(other: EvidenceType): boolean {
    return this.value === other.value;
  }

  getDisplayName(): string {
    const displayNames: Record<typeof this.value, string> = {
      document: 'Document',
      photo: 'Photograph',
      email: 'Email',
      recording: 'Audio/Video Recording',
      note: 'Note',
      witness: 'Witness Statement'
    };
    return displayNames[this.value];
  }

  getIcon(): string {
    const icons: Record<typeof this.value, string> = {
      document: 'FileText',
      photo: 'Image',
      email: 'Mail',
      recording: 'Mic',
      note: 'StickyNote',
      witness: 'User'
    };
    return icons[this.value];
  }

  requiresFile(): boolean {
    // Witness statements and notes might not require file uploads
    return this.value !== 'witness' && this.value !== 'note';
  }

  getAllowedExtensions(): string[] {
    const extensionMap: Record<typeof this.value, string[]> = {
      document: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'],
      photo: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'],
      email: ['.eml', '.msg', '.txt', '.pdf'],
      recording: ['.mp3', '.wav', '.m4a', '.mp4', '.avi', '.mov', '.webm'],
      note: ['.txt', '.md', '.rtf'],
      witness: ['.pdf', '.doc', '.docx', '.txt']
    };
    return extensionMap[this.value];
  }

  getMaxFileSize(): number {
    // Return max file size in bytes
    const sizeLimits: Record<typeof this.value, number> = {
      document: 10 * 1024 * 1024, // 10MB
      photo: 5 * 1024 * 1024, // 5MB
      email: 5 * 1024 * 1024, // 5MB
      recording: 100 * 1024 * 1024, // 100MB
      note: 1 * 1024 * 1024, // 1MB
      witness: 10 * 1024 * 1024 // 10MB
    };
    return sizeLimits[this.value];
  }
}