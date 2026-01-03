import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/chat_entity.dart';

part 'chat_state.freezed.dart';

/// Chat state using sealed class pattern
@freezed
sealed class ChatState with _$ChatState {
  /// Initial state - no messages
  const factory ChatState.initial() = ChatInitial;

  /// Loading state - loading conversation
  const factory ChatState.loading() = ChatLoading;

  /// Loaded state - messages available
  const factory ChatState.loaded({
    required List<MessageEntity> messages,
    int? conversationId,
    @Default(false) bool isStreaming,
  }) = ChatLoaded;

  /// Streaming state - AI is responding
  const factory ChatState.streaming({
    required List<MessageEntity> messages,
    int? conversationId,
    @Default('') String partialResponse,
  }) = ChatStreaming;

  /// Error state
  const factory ChatState.error({
    required String message,
    List<MessageEntity>? messages,
    int? conversationId,
  }) = ChatError;
}

/// Extension methods for ChatState
extension ChatStateX on ChatState {
  /// Check if chat is loading
  bool get isLoading => this is ChatLoading;

  /// Check if AI is streaming
  bool get isStreaming => this is ChatStreaming;

  /// Check if there's an error
  bool get hasError => this is ChatError;

  /// Get current messages
  List<MessageEntity> get messages {
    return switch (this) {
      ChatLoaded(:final messages) => messages,
      ChatStreaming(:final messages) => messages,
      ChatError(:final messages) => messages ?? [],
      _ => [],
    };
  }

  /// Get current conversation ID
  int? get conversationId {
    return switch (this) {
      ChatLoaded(:final conversationId) => conversationId,
      ChatStreaming(:final conversationId) => conversationId,
      ChatError(:final conversationId) => conversationId,
      _ => null,
    };
  }

  /// Get partial response during streaming
  String get partialResponse {
    return switch (this) {
      ChatStreaming(:final partialResponse) => partialResponse,
      _ => '',
    };
  }

  /// Get error message if in error state
  String? get errorMessage {
    return switch (this) {
      ChatError(:final message) => message,
      _ => null,
    };
  }

  /// Check if can send message
  bool get canSendMessage =>
      this is ChatLoaded || this is ChatInitial || this is ChatError;
}

/// Conversations list state
@freezed
sealed class ConversationsState with _$ConversationsState {
  /// Initial state
  const factory ConversationsState.initial() = ConversationsInitial;

  /// Loading state
  const factory ConversationsState.loading() = ConversationsLoading;

  /// Loaded state
  const factory ConversationsState.loaded({
    required List<ConversationEntity> conversations,
  }) = ConversationsLoaded;

  /// Error state
  const factory ConversationsState.error({
    required String message,
  }) = ConversationsError;
}

/// Extension methods for ConversationsState
extension ConversationsStateX on ConversationsState {
  /// Check if loading
  bool get isLoading => this is ConversationsLoading;

  /// Get conversations list
  List<ConversationEntity> get conversations {
    return switch (this) {
      ConversationsLoaded(:final conversations) => conversations,
      _ => [],
    };
  }

  /// Get error message
  String? get errorMessage {
    return switch (this) {
      ConversationsError(:final message) => message,
      _ => null,
    };
  }
}
