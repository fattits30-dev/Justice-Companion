// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'evidence_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$EvidenceEntityImpl _$$EvidenceEntityImplFromJson(Map<String, dynamic> json) =>
    _$EvidenceEntityImpl(
      id: (json['id'] as num).toInt(),
      caseId: (json['caseId'] as num).toInt(),
      title: json['title'] as String,
      filePath: json['filePath'] as String?,
      content: json['content'] as String?,
      evidenceType: $enumDecode(_$EvidenceTypeEnumMap, json['evidenceType']),
      obtainedDate: json['obtainedDate'] == null
          ? null
          : DateTime.parse(json['obtainedDate'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$$EvidenceEntityImplToJson(
  _$EvidenceEntityImpl instance,
) => <String, dynamic>{
  'id': instance.id,
  'caseId': instance.caseId,
  'title': instance.title,
  'filePath': instance.filePath,
  'content': instance.content,
  'evidenceType': _$EvidenceTypeEnumMap[instance.evidenceType]!,
  'obtainedDate': instance.obtainedDate?.toIso8601String(),
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

const _$EvidenceTypeEnumMap = {
  EvidenceType.document: 'document',
  EvidenceType.photo: 'photo',
  EvidenceType.email: 'email',
  EvidenceType.recording: 'recording',
  EvidenceType.note: 'note',
  EvidenceType.witness: 'witness',
};

_$EvidenceCreateImpl _$$EvidenceCreateImplFromJson(Map<String, dynamic> json) =>
    _$EvidenceCreateImpl(
      caseId: (json['caseId'] as num).toInt(),
      title: json['title'] as String,
      filePath: json['filePath'] as String?,
      content: json['content'] as String?,
      evidenceType: $enumDecode(_$EvidenceTypeEnumMap, json['evidenceType']),
      obtainedDate: json['obtainedDate'] == null
          ? null
          : DateTime.parse(json['obtainedDate'] as String),
    );

Map<String, dynamic> _$$EvidenceCreateImplToJson(
  _$EvidenceCreateImpl instance,
) => <String, dynamic>{
  'caseId': instance.caseId,
  'title': instance.title,
  'filePath': instance.filePath,
  'content': instance.content,
  'evidenceType': _$EvidenceTypeEnumMap[instance.evidenceType]!,
  'obtainedDate': instance.obtainedDate?.toIso8601String(),
};

_$EvidenceUpdateImpl _$$EvidenceUpdateImplFromJson(Map<String, dynamic> json) =>
    _$EvidenceUpdateImpl(
      title: json['title'] as String?,
      content: json['content'] as String?,
      evidenceType: $enumDecodeNullable(
        _$EvidenceTypeEnumMap,
        json['evidenceType'],
      ),
      obtainedDate: json['obtainedDate'] == null
          ? null
          : DateTime.parse(json['obtainedDate'] as String),
    );

Map<String, dynamic> _$$EvidenceUpdateImplToJson(
  _$EvidenceUpdateImpl instance,
) => <String, dynamic>{
  'title': instance.title,
  'content': instance.content,
  'evidenceType': _$EvidenceTypeEnumMap[instance.evidenceType],
  'obtainedDate': instance.obtainedDate?.toIso8601String(),
};
