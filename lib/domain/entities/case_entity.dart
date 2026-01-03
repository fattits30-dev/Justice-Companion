import 'package:freezed_annotation/freezed_annotation.dart';
import '../enums/case_enums.dart';

part 'case_entity.freezed.dart';
part 'case_entity.g.dart';

/// Case entity representing a legal case
@freezed
class CaseEntity with _$CaseEntity {
  const factory CaseEntity({
    required int id,
    required String title,
    String? description,
    required CaseType caseType,
    required CaseStatus status,
    required int userId,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _CaseEntity;

  factory CaseEntity.fromJson(Map<String, dynamic> json) =>
      _$CaseEntityFromJson(json);
}

/// Input for creating a new case
@freezed
class CaseCreate with _$CaseCreate {
  const factory CaseCreate({
    required String title,
    String? description,
    required CaseType caseType,
    @Default(CaseStatus.active) CaseStatus status,
  }) = _CaseCreate;

  factory CaseCreate.fromJson(Map<String, dynamic> json) =>
      _$CaseCreateFromJson(json);
}

/// Input for updating a case
@freezed
class CaseUpdate with _$CaseUpdate {
  const factory CaseUpdate({
    String? title,
    String? description,
    CaseType? caseType,
    CaseStatus? status,
  }) = _CaseUpdate;

  factory CaseUpdate.fromJson(Map<String, dynamic> json) =>
      _$CaseUpdateFromJson(json);
}
