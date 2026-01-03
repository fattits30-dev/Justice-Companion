import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../storage/secure_storage_service.dart';

/// API Client for communicating with the FastAPI backend
class ApiClient {
  final Dio _dio;
  final Ref? _ref;
  final SecureStorageService? _secureStorage;

  ApiClient({
    required String baseUrl,
    Ref? ref,
    SecureStorageService? secureStorage,
    Duration connectTimeout = const Duration(seconds: 30),
    Duration receiveTimeout = const Duration(seconds: 30),
  }) : _ref = ref,
       _secureStorage = secureStorage,
       _dio = Dio(
         BaseOptions(
           baseUrl: baseUrl,
           connectTimeout: connectTimeout,
           receiveTimeout: receiveTimeout,
           headers: {
             'Content-Type': 'application/json',
             'Accept': 'application/json',
           },
         ),
       ) {
    _dio.interceptors.addAll([
      _AuthInterceptor(ref, secureStorage),
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) => print('[API] $obj'),
      ),
      _RetryInterceptor(_dio),
    ]);
  }

  Dio get dio => _dio;

  /// GET request
  Future<T> get<T>(
    String path, {
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.get<dynamic>(
      path,
      queryParameters: queryParameters,
      options: options,
    );
    return _unwrapResponse<T>(response);
  }

  /// POST request
  Future<T> post<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.post<dynamic>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
    return _unwrapResponse<T>(response);
  }

  /// PUT request
  Future<T> put<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.put<dynamic>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
    return _unwrapResponse<T>(response);
  }

  /// DELETE request
  Future<T> delete<T>(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
    Options? options,
  }) async {
    final response = await _dio.delete<dynamic>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: options,
    );
    return _unwrapResponse<T>(response);
  }

  /// Upload file with multipart form data
  Future<T> upload<T>(
    String path, {
    required FormData formData,
    void Function(int, int)? onSendProgress,
    Options? options,
  }) async {
    final response = await _dio.post<dynamic>(
      path,
      data: formData,
      onSendProgress: onSendProgress,
      options: options,
    );
    return _unwrapResponse<T>(response);
  }

  /// Stream response (for SSE/streaming chat)
  Stream<String> stream(
    String path, {
    dynamic data,
    Map<String, dynamic>? queryParameters,
  }) async* {
    final response = await _dio.post<ResponseBody>(
      path,
      data: data,
      queryParameters: queryParameters,
      options: Options(
        headers: {'Accept': 'text/event-stream'},
        responseType: ResponseType.stream,
      ),
    );

    await for (final chunk in response.data!.stream) {
      final lines = utf8.decode(chunk).split('\n');
      for (final line in lines) {
        if (line.startsWith('data: ')) {
          yield line.substring(6);
        }
      }
    }
  }

  /// Unwrap the API response from {success, data} format
  T _unwrapResponse<T>(Response response) {
    final body = response.data;

    if (body is Map<String, dynamic>) {
      if (body['success'] == true && body.containsKey('data')) {
        return body['data'] as T;
      }
      if (body['success'] == false) {
        // Handle error response format: {success: false, error: {message, code, details}}
        final error = body['error'];
        String message = 'Unknown error';
        String? code;
        if (error is Map<String, dynamic>) {
          message = error['message'] ?? error['details'] ?? message;
          code = error['code'];
        } else {
          message = body['detail'] ?? body['message'] ?? message;
          code = body['code'];
        }
        throw ApiException(
          message: message,
          statusCode: response.statusCode,
          details: code,
        );
      }
    }

    return body as T;
  }
}

/// Auth interceptor to add session token to requests
class _AuthInterceptor extends Interceptor {
  final Ref? _ref;
  final SecureStorageService? _secureStorage;

  _AuthInterceptor(this._ref, this._secureStorage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    // Skip auth header for login/register endpoints
    final path = options.path;
    final skipAuthPaths = [
      '/auth/login',
      '/auth/register',
      '/auth/forgot-password',
      '/auth/reset-password',
    ];
    if (skipAuthPaths.any((p) => path.contains(p))) {
      handler.next(options);
      return;
    }

    // Get session ID from secure storage
    final sessionId = await _secureStorage?.getSessionId();
    if (sessionId != null) {
      options.headers['Authorization'] = 'Bearer $sessionId';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) {
    if (err.response?.statusCode == 401) {
      // Session expired or invalid - trigger logout
      // This will be handled by the repository layer
      // The auth provider will update state accordingly
    }
    handler.next(err);
  }
}

/// Retry interceptor for failed requests
class _RetryInterceptor extends Interceptor {
  final Dio _dio;
  final int maxRetries;
  final Duration retryDelay;

  _RetryInterceptor(
    this._dio, {
    this.maxRetries = 3,
    this.retryDelay = const Duration(seconds: 1),
  });

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    final options = err.requestOptions;
    final retryCount = options.extra['retryCount'] ?? 0;

    // Only retry on network errors or 5xx server errors
    final shouldRetry = _shouldRetry(err) && retryCount < maxRetries;

    if (shouldRetry) {
      options.extra['retryCount'] = retryCount + 1;

      // Exponential backoff
      await Future.delayed(retryDelay * (retryCount + 1));

      try {
        final response = await _dio.fetch(options);
        handler.resolve(response);
        return;
      } catch (e) {
        // Continue to error handler
      }
    }

    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.sendTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError ||
        (err.response?.statusCode != null &&
            err.response!.statusCode! >= 500 &&
            err.response!.statusCode! < 600);
  }
}

/// API Exception
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException({required this.message, this.statusCode, this.details});

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

/// API endpoints constants
class ApiEndpoints {
  static const String baseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://localhost:8000',
  );

  // Auth
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String logout = '/auth/logout';
  static const String session = '/auth/session';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String changePassword = '/auth/change-password';

  // Cases
  static const String cases = '/cases';
  static String caseById(int id) => '/cases/$id';

  // Evidence
  static const String evidence = '/evidence';
  static String evidenceById(int id) => '/evidence/$id';
  static String evidenceByCase(int caseId) => '/evidence/case/$caseId';
  static const String evidenceUpload = '/evidence/upload';

  // Deadlines
  static const String deadlines = '/deadlines';
  static String deadlineById(int id) => '/deadlines/$id';
  static String deadlinesByCase(int caseId) => '/deadlines/case/$caseId';
  static const String upcomingDeadlines = '/deadlines/upcoming';
  static const String overdueDeadlines = '/deadlines/overdue';

  // Dashboard
  static const String dashboard = '/dashboard';
  static const String dashboardStats = '/dashboard/stats';

  // Chat
  static const String chatStream = '/chat/stream';
  static const String chatSend = '/chat/send';
  static const String conversations = '/chat/conversations';

  // Search
  static const String search = '/search';

  // Profile
  static const String profile = '/profile';

  // GDPR
  static const String gdprExport = '/gdpr/export';
  static const String gdprDelete = '/gdpr/delete';
}
