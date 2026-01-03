/// Case type enumeration
enum CaseType {
  employment,
  housing,
  consumer,
  family,
  debt,
  other;

  String get displayName {
    switch (this) {
      case CaseType.employment:
        return 'Employment';
      case CaseType.housing:
        return 'Housing';
      case CaseType.consumer:
        return 'Consumer';
      case CaseType.family:
        return 'Family';
      case CaseType.debt:
        return 'Debt';
      case CaseType.other:
        return 'Other';
    }
  }

  static CaseType fromString(String value) {
    return CaseType.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => CaseType.other,
    );
  }
}

/// Case status enumeration
enum CaseStatus {
  active,
  closed,
  pending;

  String get displayName {
    switch (this) {
      case CaseStatus.active:
        return 'Active';
      case CaseStatus.closed:
        return 'Closed';
      case CaseStatus.pending:
        return 'Pending';
    }
  }

  static CaseStatus fromString(String value) {
    return CaseStatus.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => CaseStatus.pending,
    );
  }
}

/// Evidence type enumeration
enum EvidenceType {
  document,
  photo,
  email,
  recording,
  note,
  witness;

  String get displayName {
    switch (this) {
      case EvidenceType.document:
        return 'Document';
      case EvidenceType.photo:
        return 'Photo';
      case EvidenceType.email:
        return 'Email';
      case EvidenceType.recording:
        return 'Recording';
      case EvidenceType.note:
        return 'Note';
      case EvidenceType.witness:
        return 'Witness';
    }
  }

  String get icon {
    switch (this) {
      case EvidenceType.document:
        return 'file-text';
      case EvidenceType.photo:
        return 'image';
      case EvidenceType.email:
        return 'mail';
      case EvidenceType.recording:
        return 'mic';
      case EvidenceType.note:
        return 'edit-3';
      case EvidenceType.witness:
        return 'user';
    }
  }

  static EvidenceType fromString(String value) {
    return EvidenceType.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => EvidenceType.document,
    );
  }
}

/// Deadline priority enumeration
enum DeadlinePriority {
  low,
  medium,
  high,
  critical;

  String get displayName {
    switch (this) {
      case DeadlinePriority.low:
        return 'Low';
      case DeadlinePriority.medium:
        return 'Medium';
      case DeadlinePriority.high:
        return 'High';
      case DeadlinePriority.critical:
        return 'Critical';
    }
  }

  static DeadlinePriority fromString(String value) {
    return DeadlinePriority.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => DeadlinePriority.medium,
    );
  }
}

/// Deadline status enumeration
enum DeadlineStatus {
  upcoming,
  overdue,
  completed;

  String get displayName {
    switch (this) {
      case DeadlineStatus.upcoming:
        return 'Upcoming';
      case DeadlineStatus.overdue:
        return 'Overdue';
      case DeadlineStatus.completed:
        return 'Completed';
    }
  }

  static DeadlineStatus fromString(String value) {
    return DeadlineStatus.values.firstWhere(
      (e) => e.name == value.toLowerCase(),
      orElse: () => DeadlineStatus.upcoming,
    );
  }
}
