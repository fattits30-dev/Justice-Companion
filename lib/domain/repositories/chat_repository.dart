import 'package:dartz/dartz.dart';
import '../../core/error/failures.dart';
import '../../data/models/chat_models.dart';
import '../entities/chat_entity.dart';

/// Repository interface for chat operations
/// Uses Either for type-safe error handling
abstract class ChatRepository {
  /// Stream chat response (SSE)
  /// Yields events as they arrive from the server
  Stream<Either<Failure, ChatStreamEvent>> streamChat(
    String message, {
    int? conversationId,
    int? caseId,
    bool useRag = true,
  });

  /// Send chat message (non-streaming)
  /// Returns the AI response message
  Future<Either<Failure, MessageEntity>> sendChat(
    String message, {
    int? conversationId,
    int? caseId,
    bool useRag = true,
  });

  /// Get all conversations for user
  Future<Either<Failure, List<ConversationEntity>>> getConversations({
    int? caseId,
  });

  /// Get a specific conversation with all messages
  Future<Either<Failure, ConversationWithMessages>> getConversation(int id);

  /// Delete a conversation
  Future<Either<Failure, void>> deleteConversation(int id);
}
