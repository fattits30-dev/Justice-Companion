import 'package:freezed_annotation/freezed_annotation.dart';

part 'chat_entity.freezed.dart';
part 'chat_entity.g.dart';

/// Message role enum
enum MessageRole {
  @JsonValue('user')
  user,
  @JsonValue('assistant')
  assistant,
  @JsonValue('system')
  system,
}

/// Conversation entity representing a chat conversation
@freezed
class ConversationEntity with _$ConversationEntity {
  const factory ConversationEntity({
    required int id,
    required int userId,
    int? caseId,
    required String title,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default(0) int messageCount,
  }) = _ConversationEntity;

  factory ConversationEntity.fromJson(Map<String, dynamic> json) =>
      _$ConversationEntityFromJson(json);
}

/// Message entity representing a single chat message
@freezed
class MessageEntity with _$MessageEntity {
  const factory MessageEntity({
    required int id,
    required int conversationId,
    required MessageRole role,
    required String content,
    required DateTime timestamp,
    int? tokenCount,
  }) = _MessageEntity;

  factory MessageEntity.fromJson(Map<String, dynamic> json) =>
      _$MessageEntityFromJson(json);
}

/// Conversation with all its messages
@freezed
class ConversationWithMessages with _$ConversationWithMessages {
  const factory ConversationWithMessages({
    required ConversationEntity conversation,
    required List<MessageEntity> messages,
  }) = _ConversationWithMessages;

  factory ConversationWithMessages.fromJson(Map<String, dynamic> json) =>
      _$ConversationWithMessagesFromJson(json);
}
