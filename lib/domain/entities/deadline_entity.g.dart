// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'deadline_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$DeadlineEntityImpl _$$DeadlineEntityImplFromJson(Map<String, dynamic> json) =>
    _$DeadlineEntityImpl(
      id: (json['id'] as num).toInt(),
      caseId: (json['caseId'] as num).toInt(),
      userId: (json['userId'] as num).toInt(),
      title: json['title'] as String,
      description: json['description'] as String?,
      deadlineDate: DateTime.parse(json['deadlineDate'] as String),
      priority: $enumDecode(_$DeadlinePriorityEnumMap, json['priority']),
      status: $enumDecode(_$DeadlineStatusEnumMap, json['status']),
      completedAt: json['completedAt'] == null
          ? null
          : DateTime.parse(json['completedAt'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$$DeadlineEntityImplToJson(
  _$DeadlineEntityImpl instance,
) => <String, dynamic>{
  'id': instance.id,
  'caseId': instance.caseId,
  'userId': instance.userId,
  'title': instance.title,
  'description': instance.description,
  'deadlineDate': instance.deadlineDate.toIso8601String(),
  'priority': _$DeadlinePriorityEnumMap[instance.priority]!,
  'status': _$DeadlineStatusEnumMap[instance.status]!,
  'completedAt': instance.completedAt?.toIso8601String(),
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

const _$DeadlinePriorityEnumMap = {
  DeadlinePriority.low: 'low',
  DeadlinePriority.medium: 'medium',
  DeadlinePriority.high: 'high',
  DeadlinePriority.critical: 'critical',
};

const _$DeadlineStatusEnumMap = {
  DeadlineStatus.upcoming: 'upcoming',
  DeadlineStatus.overdue: 'overdue',
  DeadlineStatus.completed: 'completed',
};

_$DeadlineCreateImpl _$$DeadlineCreateImplFromJson(Map<String, dynamic> json) =>
    _$DeadlineCreateImpl(
      caseId: (json['caseId'] as num).toInt(),
      title: json['title'] as String,
      description: json['description'] as String?,
      deadlineDate: DateTime.parse(json['deadlineDate'] as String),
      priority:
          $enumDecodeNullable(_$DeadlinePriorityEnumMap, json['priority']) ??
          DeadlinePriority.medium,
    );

Map<String, dynamic> _$$DeadlineCreateImplToJson(
  _$DeadlineCreateImpl instance,
) => <String, dynamic>{
  'caseId': instance.caseId,
  'title': instance.title,
  'description': instance.description,
  'deadlineDate': instance.deadlineDate.toIso8601String(),
  'priority': _$DeadlinePriorityEnumMap[instance.priority]!,
};

_$DeadlineUpdateImpl _$$DeadlineUpdateImplFromJson(Map<String, dynamic> json) =>
    _$DeadlineUpdateImpl(
      title: json['title'] as String?,
      description: json['description'] as String?,
      deadlineDate: json['deadlineDate'] == null
          ? null
          : DateTime.parse(json['deadlineDate'] as String),
      priority: $enumDecodeNullable(
        _$DeadlinePriorityEnumMap,
        json['priority'],
      ),
      status: $enumDecodeNullable(_$DeadlineStatusEnumMap, json['status']),
    );

Map<String, dynamic> _$$DeadlineUpdateImplToJson(
  _$DeadlineUpdateImpl instance,
) => <String, dynamic>{
  'title': instance.title,
  'description': instance.description,
  'deadlineDate': instance.deadlineDate?.toIso8601String(),
  'priority': _$DeadlinePriorityEnumMap[instance.priority],
  'status': _$DeadlineStatusEnumMap[instance.status],
};
