import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/entities/user_entity.dart';
import '../../domain/repositories/auth_repository.dart';
import '../providers.dart';

part 'auth_provider.g.dart';

/// Auth notifier that manages authentication state
@Riverpod(keepAlive: true)
class AuthNotifier extends _$AuthNotifier {
  late AuthRepository _repository;

  @override
  AuthState build() {
    _repository = ref.watch(authRepositoryProvider);
    // Check auth status on initialization
    _checkAuthStatus();
    return const AuthState.initial();
  }

  /// Check current authentication status
  Future<void> _checkAuthStatus() async {
    state = const AuthState.loading();

    // Check if user has valid session
    final hasSession = await _repository.hasValidSession();

    if (hasSession) {
      // Validate session with server
      final result = await _repository.validateSession();

      result.fold(
        (failure) async {
          // Session invalid - check if PIN is configured
          final hasPIN = await _repository.isPinConfigured();
          if (hasPIN) {
            state = const AuthState.pinLocked();
          } else {
            state = const AuthState.unauthenticated();
          }
        },
        (data) {
          final (user, session) = data;
          state = AuthState.authenticated(user: user, session: session);
        },
      );
    } else {
      // No session - check for PIN mode
      final hasPIN = await _repository.isPinConfigured();
      if (hasPIN) {
        state = const AuthState.pinLocked();
      } else {
        state = const AuthState.unauthenticated();
      }
    }
  }

  /// Login with credentials
  Future<void> login(LoginInput input) async {
    state = const AuthState.loading();

    final result = await _repository.login(input);

    result.fold(
      (failure) {
        state = AuthState.error(message: failure.message, code: failure.code);
      },
      (data) {
        final (user, session) = data;
        state = AuthState.authenticated(user: user, session: session);
      },
    );
  }

  /// Register new user
  Future<void> register(RegisterInput input) async {
    state = const AuthState.loading();

    final result = await _repository.register(input);

    result.fold(
      (failure) {
        state = AuthState.error(message: failure.message, code: failure.code);
      },
      (data) {
        final (user, session) = data;
        state = AuthState.authenticated(user: user, session: session);
      },
    );
  }

  /// Logout
  Future<void> logout() async {
    state = const AuthState.loading();

    await _repository.logout();
    state = const AuthState.unauthenticated();
  }

  /// Request password reset
  Future<bool> forgotPassword(String email) async {
    final result = await _repository.forgotPassword(email);

    return result.fold((failure) {
      state = AuthState.error(message: failure.message, code: failure.code);
      return false;
    }, (_) => true);
  }

  /// Reset password with token
  Future<bool> resetPassword(String token, String newPassword) async {
    final result = await _repository.resetPassword(token, newPassword);

    return result.fold((failure) {
      state = AuthState.error(message: failure.message, code: failure.code);
      return false;
    }, (_) => true);
  }

  /// Change password
  Future<bool> changePassword(String oldPassword, String newPassword) async {
    final result = await _repository.changePassword(oldPassword, newPassword);

    return result.fold((failure) {
      state = AuthState.error(message: failure.message, code: failure.code);
      return false;
    }, (_) => true);
  }

  /// Setup PIN for offline access
  Future<bool> setupPin(String pin) async {
    final result = await _repository.setupPin(pin);

    return result.fold((failure) {
      state = AuthState.error(message: failure.message, code: failure.code);
      return false;
    }, (_) => true);
  }

  /// Unlock with PIN
  Future<void> unlockWithPin(String pin) async {
    state = const AuthState.loading();

    final result = await _repository.unlockWithPin(pin);

    result.fold(
      (failure) {
        state = AuthState.error(message: failure.message, code: failure.code);
      },
      (user) {
        // Enter offline mode with cached user
        state = AuthState.offline(user: user);
      },
    );
  }

  /// Clear PIN
  Future<bool> clearPin() async {
    final result = await _repository.clearPin();

    return result.fold((failure) => false, (_) => true);
  }

  /// Clear error state
  void clearError() {
    if (state is AuthError) {
      state = const AuthState.unauthenticated();
    }
  }

  /// Retry auth check
  Future<void> retry() async {
    await _checkAuthStatus();
  }

  /// Enter offline mode (for explicit "Use Offline" action)
  Future<void> enterOfflineMode() async {
    final user = await _repository.getCurrentUser();
    if (user != null) {
      state = AuthState.offline(user: user);
    } else {
      state = const AuthState.error(
        message: 'No cached user data available for offline mode',
        code: 'NO_CACHE',
      );
    }
  }
}

/// Provider for checking if user is authenticated
@riverpod
bool isAuthenticated(IsAuthenticatedRef ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.isAuthenticated;
}

/// Provider for current user
@riverpod
UserEntity? currentUser(CurrentUserRef ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.user;
}

/// Provider for current session
@riverpod
SessionEntity? currentSession(CurrentSessionRef ref) {
  final authState = ref.watch(authNotifierProvider);
  return authState.session;
}
