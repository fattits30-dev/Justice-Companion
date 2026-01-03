import 'package:freezed_annotation/freezed_annotation.dart';
import '../enums/case_enums.dart';

part 'deadline_entity.freezed.dart';
part 'deadline_entity.g.dart';

/// Deadline entity representing a case deadline or milestone
@freezed
class DeadlineEntity with _$DeadlineEntity {
  const factory DeadlineEntity({
    required int id,
    required int caseId,
    required int userId,
    required String title,
    String? description,
    required DateTime deadlineDate,
    required DeadlinePriority priority,
    required DeadlineStatus status,
    DateTime? completedAt,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _DeadlineEntity;

  factory DeadlineEntity.fromJson(Map<String, dynamic> json) =>
      _$DeadlineEntityFromJson(json);
}

/// Input for creating a new deadline
@freezed
class DeadlineCreate with _$DeadlineCreate {
  const factory DeadlineCreate({
    required int caseId,
    required String title,
    String? description,
    required DateTime deadlineDate,
    @Default(DeadlinePriority.medium) DeadlinePriority priority,
  }) = _DeadlineCreate;

  factory DeadlineCreate.fromJson(Map<String, dynamic> json) =>
      _$DeadlineCreateFromJson(json);
}

/// Input for updating a deadline
@freezed
class DeadlineUpdate with _$DeadlineUpdate {
  const factory DeadlineUpdate({
    String? title,
    String? description,
    DateTime? deadlineDate,
    DeadlinePriority? priority,
    DeadlineStatus? status,
  }) = _DeadlineUpdate;

  factory DeadlineUpdate.fromJson(Map<String, dynamic> json) =>
      _$DeadlineUpdateFromJson(json);
}
