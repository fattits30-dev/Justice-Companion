// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$ConversationEntityImpl _$$ConversationEntityImplFromJson(
  Map<String, dynamic> json,
) => _$ConversationEntityImpl(
  id: (json['id'] as num).toInt(),
  userId: (json['userId'] as num).toInt(),
  caseId: (json['caseId'] as num?)?.toInt(),
  title: json['title'] as String,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
  messageCount: (json['messageCount'] as num?)?.toInt() ?? 0,
);

Map<String, dynamic> _$$ConversationEntityImplToJson(
  _$ConversationEntityImpl instance,
) => <String, dynamic>{
  'id': instance.id,
  'userId': instance.userId,
  'caseId': instance.caseId,
  'title': instance.title,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
  'messageCount': instance.messageCount,
};

_$MessageEntityImpl _$$MessageEntityImplFromJson(Map<String, dynamic> json) =>
    _$MessageEntityImpl(
      id: (json['id'] as num).toInt(),
      conversationId: (json['conversationId'] as num).toInt(),
      role: $enumDecode(_$MessageRoleEnumMap, json['role']),
      content: json['content'] as String,
      timestamp: DateTime.parse(json['timestamp'] as String),
      tokenCount: (json['tokenCount'] as num?)?.toInt(),
    );

Map<String, dynamic> _$$MessageEntityImplToJson(_$MessageEntityImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'conversationId': instance.conversationId,
      'role': _$MessageRoleEnumMap[instance.role]!,
      'content': instance.content,
      'timestamp': instance.timestamp.toIso8601String(),
      'tokenCount': instance.tokenCount,
    };

const _$MessageRoleEnumMap = {
  MessageRole.user: 'user',
  MessageRole.assistant: 'assistant',
  MessageRole.system: 'system',
};

_$ConversationWithMessagesImpl _$$ConversationWithMessagesImplFromJson(
  Map<String, dynamic> json,
) => _$ConversationWithMessagesImpl(
  conversation: ConversationEntity.fromJson(
    json['conversation'] as Map<String, dynamic>,
  ),
  messages: (json['messages'] as List<dynamic>)
      .map((e) => MessageEntity.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$$ConversationWithMessagesImplToJson(
  _$ConversationWithMessagesImpl instance,
) => <String, dynamic>{
  'conversation': instance.conversation,
  'messages': instance.messages,
};
