import 'package:freezed_annotation/freezed_annotation.dart';
import '../../domain/entities/user_entity.dart';

part 'auth_state.freezed.dart';

/// Authentication state using sealed class pattern
@freezed
sealed class AuthState with _$AuthState {
  /// Initial state - checking auth status
  const factory AuthState.initial() = AuthInitial;

  /// Loading state - during auth operations
  const factory AuthState.loading() = AuthLoading;

  /// Authenticated - user is logged in
  const factory AuthState.authenticated({
    required UserEntity user,
    required SessionEntity session,
  }) = AuthAuthenticated;

  /// Unauthenticated - no valid session
  const factory AuthState.unauthenticated() = AuthUnauthenticated;

  /// PIN locked - user has PIN but needs to unlock
  const factory AuthState.pinLocked() = AuthPinLocked;

  /// Offline mode - using cached data
  const factory AuthState.offline({
    required UserEntity user,
  }) = AuthOffline;

  /// Error state
  const factory AuthState.error({
    required String message,
    String? code,
  }) = AuthError;
}

/// Extension methods for AuthState
extension AuthStateX on AuthState {
  /// Check if user is authenticated (online or offline)
  bool get isAuthenticated => this is AuthAuthenticated || this is AuthOffline;

  /// Check if auth check is in progress
  bool get isLoading => this is AuthLoading;

  /// Check if there's an error
  bool get hasError => this is AuthError;

  /// Get current user if authenticated
  UserEntity? get user {
    return switch (this) {
      AuthAuthenticated(:final user) => user,
      AuthOffline(:final user) => user,
      _ => null,
    };
  }

  /// Get current session if authenticated
  SessionEntity? get session {
    return switch (this) {
      AuthAuthenticated(:final session) => session,
      _ => null,
    };
  }

  /// Get error message if in error state
  String? get errorMessage {
    return switch (this) {
      AuthError(:final message) => message,
      _ => null,
    };
  }
}
