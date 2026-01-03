// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'case_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$CaseEntityImpl _$$CaseEntityImplFromJson(Map<String, dynamic> json) =>
    _$CaseEntityImpl(
      id: (json['id'] as num).toInt(),
      title: json['title'] as String,
      description: json['description'] as String?,
      caseType: $enumDecode(_$CaseTypeEnumMap, json['caseType']),
      status: $enumDecode(_$CaseStatusEnumMap, json['status']),
      userId: (json['userId'] as num).toInt(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$$CaseEntityImplToJson(_$CaseEntityImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'description': instance.description,
      'caseType': _$CaseTypeEnumMap[instance.caseType]!,
      'status': _$CaseStatusEnumMap[instance.status]!,
      'userId': instance.userId,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

const _$CaseTypeEnumMap = {
  CaseType.employment: 'employment',
  CaseType.housing: 'housing',
  CaseType.consumer: 'consumer',
  CaseType.family: 'family',
  CaseType.debt: 'debt',
  CaseType.other: 'other',
};

const _$CaseStatusEnumMap = {
  CaseStatus.active: 'active',
  CaseStatus.closed: 'closed',
  CaseStatus.pending: 'pending',
};

_$CaseCreateImpl _$$CaseCreateImplFromJson(Map<String, dynamic> json) =>
    _$CaseCreateImpl(
      title: json['title'] as String,
      description: json['description'] as String?,
      caseType: $enumDecode(_$CaseTypeEnumMap, json['caseType']),
      status:
          $enumDecodeNullable(_$CaseStatusEnumMap, json['status']) ??
          CaseStatus.active,
    );

Map<String, dynamic> _$$CaseCreateImplToJson(_$CaseCreateImpl instance) =>
    <String, dynamic>{
      'title': instance.title,
      'description': instance.description,
      'caseType': _$CaseTypeEnumMap[instance.caseType]!,
      'status': _$CaseStatusEnumMap[instance.status]!,
    };

_$CaseUpdateImpl _$$CaseUpdateImplFromJson(Map<String, dynamic> json) =>
    _$CaseUpdateImpl(
      title: json['title'] as String?,
      description: json['description'] as String?,
      caseType: $enumDecodeNullable(_$CaseTypeEnumMap, json['caseType']),
      status: $enumDecodeNullable(_$CaseStatusEnumMap, json['status']),
    );

Map<String, dynamic> _$$CaseUpdateImplToJson(_$CaseUpdateImpl instance) =>
    <String, dynamic>{
      'title': instance.title,
      'description': instance.description,
      'caseType': _$CaseTypeEnumMap[instance.caseType],
      'status': _$CaseStatusEnumMap[instance.status],
    };
