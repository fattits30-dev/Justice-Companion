import 'package:freezed_annotation/freezed_annotation.dart';
import '../enums/case_enums.dart';

part 'evidence_entity.freezed.dart';
part 'evidence_entity.g.dart';

/// Evidence entity representing a piece of evidence attached to a case
@freezed
class EvidenceEntity with _$EvidenceEntity {
  const factory EvidenceEntity({
    required int id,
    required int caseId,
    required String title,
    String? filePath,
    String? content,
    required EvidenceType evidenceType,
    DateTime? obtainedDate,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _EvidenceEntity;

  factory EvidenceEntity.fromJson(Map<String, dynamic> json) =>
      _$EvidenceEntityFromJson(json);
}

/// Input for creating new evidence
@freezed
class EvidenceCreate with _$EvidenceCreate {
  const factory EvidenceCreate({
    required int caseId,
    required String title,
    String? filePath,
    String? content,
    required EvidenceType evidenceType,
    DateTime? obtainedDate,
  }) = _EvidenceCreate;

  factory EvidenceCreate.fromJson(Map<String, dynamic> json) =>
      _$EvidenceCreateFromJson(json);
}

/// Input for updating evidence
@freezed
class EvidenceUpdate with _$EvidenceUpdate {
  const factory EvidenceUpdate({
    String? title,
    String? content,
    EvidenceType? evidenceType,
    DateTime? obtainedDate,
  }) = _EvidenceUpdate;

  factory EvidenceUpdate.fromJson(Map<String, dynamic> json) =>
      _$EvidenceUpdateFromJson(json);
}
