import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/network/api_client.dart';
import '../core/services/huggingface_service.dart';
import '../core/storage/secure_storage_service.dart';
import '../data/data_sources/auth_local_data_source.dart';
import '../data/data_sources/auth_remote_data_source.dart';
import '../data/data_sources/chat_remote_data_source.dart';
import '../data/repositories/auth_repository_impl.dart';
import '../data/repositories/chat_repository_impl.dart';
import '../domain/repositories/auth_repository.dart';
import '../domain/repositories/chat_repository.dart';

// Re-export auth providers for convenience
export 'auth/auth_provider.dart';
export 'auth/auth_state.dart';

// Re-export chat providers for convenience
export 'chat/chat_provider.dart';
export 'chat/chat_state.dart';

/// HuggingFace API token (set via --dart-define=HUGGINGFACE_TOKEN=...)
const String _huggingFaceToken = String.fromEnvironment(
  'HUGGINGFACE_TOKEN',
  defaultValue: '',
);

/// Whether to use HuggingFace AI instead of backend
/// Set via --dart-define=USE_HF_AI=true
const bool useHuggingFaceAI = bool.fromEnvironment(
  'USE_HF_AI',
  defaultValue: false,
);

// ============ Core Services ============

/// Secure storage service provider
final secureStorageProvider = Provider<SecureStorageService>((ref) {
  return SecureStorageService();
});

/// API client provider
final apiClientProvider = Provider<ApiClient>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return ApiClient(
    baseUrl: ApiEndpoints.baseUrl,
    ref: ref,
    secureStorage: secureStorage,
  );
});

// ============ Data Sources ============

/// Auth remote data source provider
final authRemoteDataSourceProvider = Provider<AuthRemoteDataSource>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return AuthRemoteDataSourceImpl(apiClient);
});

/// Auth local data source provider
final authLocalDataSourceProvider = Provider<AuthLocalDataSource>((ref) {
  final secureStorage = ref.watch(secureStorageProvider);
  return AuthLocalDataSourceImpl(secureStorage);
});

// ============ Repositories ============

/// Auth repository provider
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  final remoteDataSource = ref.watch(authRemoteDataSourceProvider);
  final localDataSource = ref.watch(authLocalDataSourceProvider);
  final secureStorage = ref.watch(secureStorageProvider);

  return AuthRepositoryImpl(
    remoteDataSource: remoteDataSource,
    localDataSource: localDataSource,
    secureStorage: secureStorage,
  );
});

// ============ AI Services ============

/// HuggingFace service provider
final huggingFaceServiceProvider = Provider<HuggingFaceService>((ref) {
  if (_huggingFaceToken.isEmpty) {
    throw StateError(
      'HUGGINGFACE_TOKEN is not set. Provide --dart-define=HUGGINGFACE_TOKEN=... to use Hugging Face.',
    );
  }
  return HuggingFaceService(apiToken: _huggingFaceToken);
});

// ============ Chat Data Sources ============

/// Chat remote data source provider
/// Uses HuggingFace when useHuggingFaceAI is true, otherwise uses backend
final chatRemoteDataSourceProvider = Provider<ChatRemoteDataSource>((ref) {
  if (useHuggingFaceAI) {
    final huggingFaceService = ref.watch(huggingFaceServiceProvider);
    return HuggingFaceChatDataSource(huggingFaceService);
  }
  final apiClient = ref.watch(apiClientProvider);
  return ChatRemoteDataSourceImpl(apiClient);
});

// ============ Chat Repository ============

/// Chat repository provider
final chatRepositoryProvider = Provider<ChatRepository>((ref) {
  final remoteDataSource = ref.watch(chatRemoteDataSourceProvider);
  return ChatRepositoryImpl(remoteDataSource: remoteDataSource);
});
