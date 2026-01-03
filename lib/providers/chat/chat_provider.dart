import 'dart:async';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/models/chat_models.dart';
import '../../domain/entities/chat_entity.dart';
import '../../domain/repositories/chat_repository.dart';
import '../providers.dart';

part 'chat_provider.g.dart';

/// Chat notifier that manages chat state and streaming
@Riverpod(keepAlive: true)
class ChatNotifier extends _$ChatNotifier {
  late ChatRepository _repository;
  StreamSubscription<dynamic>? _streamSubscription;

  @override
  ChatState build() {
    _repository = ref.watch(chatRepositoryProvider);

    // Clean up stream subscription on dispose
    ref.onDispose(() {
      _streamSubscription?.cancel();
    });

    return const ChatState.initial();
  }

  /// Send a message and stream the response
  Future<void> sendMessage(String message, {int? caseId}) async {
    // Get current messages and conversation ID
    final currentMessages = state.messages;
    final currentConversationId = state.conversationId;

    // Create user message (temporary ID - will be updated from server)
    final userMessage = MessageEntity(
      id: -1, // Temporary ID
      conversationId: currentConversationId ?? -1,
      role: MessageRole.user,
      content: message,
      timestamp: DateTime.now(),
    );

    // Add user message and start streaming
    state = ChatState.streaming(
      messages: [...currentMessages, userMessage],
      conversationId: currentConversationId,
      partialResponse: '',
    );

    // Cancel any existing stream
    await _streamSubscription?.cancel();

    String responseText = '';
    int? newConversationId = currentConversationId;

    try {
      final stream = _repository.streamChat(
        message,
        conversationId: currentConversationId,
        caseId: caseId,
      );

      await for (final result in stream) {
        result.fold(
          (failure) {
            state = ChatState.error(
              message: failure.message,
              messages: currentMessages,
              conversationId: currentConversationId,
            );
          },
          (event) {
            switch (event.type) {
              case ChatStreamEventType.token:
                // Append token to response
                responseText += event.data ?? '';
                state = ChatState.streaming(
                  messages: [...currentMessages, userMessage],
                  conversationId: newConversationId,
                  partialResponse: responseText,
                );
                break;

              case ChatStreamEventType.sources:
                // Sources received - could be used for citations
                break;

              case ChatStreamEventType.complete:
                // Stream complete - update conversation ID if new
                if (event.conversationId != null) {
                  newConversationId = event.conversationId;
                }

                // Create AI message
                final aiMessage = MessageEntity(
                  id: -2, // Temporary ID
                  conversationId: newConversationId ?? -1,
                  role: MessageRole.assistant,
                  content: responseText,
                  timestamp: DateTime.now(),
                );

                state = ChatState.loaded(
                  messages: [...currentMessages, userMessage, aiMessage],
                  conversationId: newConversationId,
                );
                break;

              case ChatStreamEventType.error:
                state = ChatState.error(
                  message: event.error ?? 'An error occurred',
                  messages: currentMessages,
                  conversationId: currentConversationId,
                );
                break;
            }
          },
        );
      }
    } catch (e) {
      state = ChatState.error(
        message: e.toString(),
        messages: currentMessages,
        conversationId: currentConversationId,
      );
    }
  }

  /// Load an existing conversation
  Future<void> loadConversation(int conversationId) async {
    state = const ChatState.loading();

    final result = await _repository.getConversation(conversationId);

    result.fold(
      (failure) {
        state = ChatState.error(message: failure.message);
      },
      (conversation) {
        state = ChatState.loaded(
          messages: conversation.messages,
          conversationId: conversation.conversation.id,
        );
      },
    );
  }

  /// Clear current conversation and start new
  void clearConversation() {
    _streamSubscription?.cancel();
    state = const ChatState.initial();
  }

  /// Cancel ongoing stream
  void cancelStream() {
    _streamSubscription?.cancel();
    if (state is ChatStreaming) {
      final streamingState = state as ChatStreaming;
      state = ChatState.loaded(
        messages: streamingState.messages,
        conversationId: streamingState.conversationId,
      );
    }
  }

  /// Clear error state
  void clearError() {
    if (state is ChatError) {
      final errorState = state as ChatError;
      if (errorState.messages != null && errorState.messages!.isNotEmpty) {
        state = ChatState.loaded(
          messages: errorState.messages!,
          conversationId: errorState.conversationId,
        );
      } else {
        state = const ChatState.initial();
      }
    }
  }
}

/// Conversations list notifier
@riverpod
class ConversationsNotifier extends _$ConversationsNotifier {
  late ChatRepository _repository;

  @override
  ConversationsState build() {
    _repository = ref.watch(chatRepositoryProvider);
    return const ConversationsState.initial();
  }

  /// Load all conversations
  Future<void> loadConversations({int? caseId}) async {
    state = const ConversationsState.loading();

    final result = await _repository.getConversations(caseId: caseId);

    result.fold(
      (failure) {
        state = ConversationsState.error(message: failure.message);
      },
      (conversations) {
        state = ConversationsState.loaded(conversations: conversations);
      },
    );
  }

  /// Delete a conversation
  Future<bool> deleteConversation(int id) async {
    final result = await _repository.deleteConversation(id);

    return result.fold((failure) => false, (_) {
      // Remove from current list
      if (state is ConversationsLoaded) {
        final currentConversations =
            (state as ConversationsLoaded).conversations;
        state = ConversationsState.loaded(
          conversations: currentConversations.where((c) => c.id != id).toList(),
        );
      }
      return true;
    });
  }

  /// Refresh conversations
  Future<void> refresh({int? caseId}) async {
    await loadConversations(caseId: caseId);
  }
}

/// Provider for checking if currently streaming
@riverpod
bool isStreaming(IsStreamingRef ref) {
  final chatState = ref.watch(chatNotifierProvider);
  return chatState.isStreaming;
}

/// Provider for current messages
@riverpod
List<MessageEntity> chatMessages(ChatMessagesRef ref) {
  final chatState = ref.watch(chatNotifierProvider);
  return chatState.messages;
}

/// Provider for partial response during streaming
@riverpod
String partialResponse(PartialResponseRef ref) {
  final chatState = ref.watch(chatNotifierProvider);
  return chatState.partialResponse;
}
