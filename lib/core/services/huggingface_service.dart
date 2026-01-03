import 'dart:convert';
import 'package:dio/dio.dart';

/// HuggingFace AI Service for generating chat responses
class HuggingFaceService {
  static const String _apiUrl = 'https://api-inference.huggingface.co/models';
  static const String _defaultModel = 'mistralai/Mistral-7B-Instruct-v0.3';

  final String _apiToken;
  final Dio _dio;
  final String _model;

  HuggingFaceService({
    required String apiToken,
    String? model,
  })  : _apiToken = apiToken,
        _model = model ?? _defaultModel,
        _dio = Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 60),
          receiveTimeout: const Duration(seconds: 120),
        ));

  /// Generate a response for a chat message
  Future<String> generateResponse(
    String message, {
    List<ChatMessage>? conversationHistory,
    String? systemPrompt,
  }) async {
    try {
      // Build the prompt with conversation history
      final prompt = _buildPrompt(
        message,
        conversationHistory: conversationHistory,
        systemPrompt: systemPrompt,
      );

      final response = await _dio.post(
        '$_apiUrl/$_model',
        data: jsonEncode({
          'inputs': prompt,
          'parameters': {
            'max_new_tokens': 1024,
            'temperature': 0.7,
            'top_p': 0.95,
            'do_sample': true,
            'return_full_text': false,
          },
        }),
        options: Options(
          headers: {
            'Authorization': 'Bearer $_apiToken',
            'Content-Type': 'application/json',
          },
        ),
      );

      if (response.statusCode == 200) {
        final data = response.data;
        if (data is List && data.isNotEmpty) {
          final generatedText = data[0]['generated_text'] as String? ?? '';
          return _cleanResponse(generatedText);
        }
      }

      throw HuggingFaceException('Failed to generate response');
    } on DioException catch (e) {
      if (e.response?.statusCode == 503) {
        // Model is loading
        throw HuggingFaceException(
          'AI model is warming up. Please try again in a few seconds.',
          isLoading: true,
        );
      }
      throw HuggingFaceException(
        e.response?.data?['error'] ?? e.message ?? 'Network error',
      );
    } catch (e) {
      if (e is HuggingFaceException) rethrow;
      throw HuggingFaceException(e.toString());
    }
  }

  /// Stream a response for a chat message
  Stream<String> streamResponse(
    String message, {
    List<ChatMessage>? conversationHistory,
    String? systemPrompt,
  }) async* {
    // HuggingFace doesn't support true streaming for most models
    // So we'll simulate streaming by yielding the response in chunks
    final response = await generateResponse(
      message,
      conversationHistory: conversationHistory,
      systemPrompt: systemPrompt,
    );

    // Yield response word by word to simulate streaming
    final words = response.split(' ');
    for (int i = 0; i < words.length; i++) {
      yield words[i] + (i < words.length - 1 ? ' ' : '');
      await Future.delayed(const Duration(milliseconds: 30));
    }
  }

  String _buildPrompt(
    String message, {
    List<ChatMessage>? conversationHistory,
    String? systemPrompt,
  }) {
    final buffer = StringBuffer();

    // System prompt for legal assistant context
    final system = systemPrompt ??
        '''You are Justice AI, a helpful legal assistant for the Justice Companion app.
You help users with:
- Understanding legal concepts and terminology
- Case research and finding relevant precedents
- Drafting legal documents and motions
- Organizing case information and evidence
- Meeting deadlines and legal procedures

Always be professional, accurate, and helpful. If you're unsure about something, say so.
Never provide advice that could be considered practicing law - encourage users to consult licensed attorneys for specific legal advice.''';

    // Format for Mistral Instruct
    buffer.write('<s>[INST] $system\n\n');

    // Add conversation history
    if (conversationHistory != null && conversationHistory.isNotEmpty) {
      for (final msg in conversationHistory) {
        if (msg.role == 'user') {
          buffer.write('User: ${msg.content}\n');
        } else if (msg.role == 'assistant') {
          buffer.write('Assistant: ${msg.content}\n');
        }
      }
    }

    buffer.write('User: $message [/INST]');

    return buffer.toString();
  }

  String _cleanResponse(String response) {
    // Remove any remaining instruction markers
    var cleaned = response
        .replaceAll('<s>', '')
        .replaceAll('</s>', '')
        .replaceAll('[INST]', '')
        .replaceAll('[/INST]', '')
        .trim();

    // Remove "Assistant:" prefix if present
    if (cleaned.toLowerCase().startsWith('assistant:')) {
      cleaned = cleaned.substring(10).trim();
    }

    return cleaned;
  }
}

/// Simple chat message class
class ChatMessage {
  final String role;
  final String content;

  ChatMessage({required this.role, required this.content});
}

/// HuggingFace exception
class HuggingFaceException implements Exception {
  final String message;
  final bool isLoading;

  HuggingFaceException(this.message, {this.isLoading = false});

  @override
  String toString() => message;
}
