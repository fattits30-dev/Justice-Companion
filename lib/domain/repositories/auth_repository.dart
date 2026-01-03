import 'package:dartz/dartz.dart';
import '../../core/error/failures.dart';
import '../entities/user_entity.dart';

/// Repository interface for authentication operations
/// Uses Either for type-safe error handling
abstract class AuthRepository {
  /// Login with username/email and password
  /// Returns user and session on success
  Future<Either<Failure, (UserEntity, SessionEntity)>> login(LoginInput input);

  /// Register a new user
  /// Returns user and session on success
  Future<Either<Failure, (UserEntity, SessionEntity)>> register(RegisterInput input);

  /// Logout and clear session
  Future<Either<Failure, void>> logout();

  /// Validate current session
  /// Returns user and session if valid
  Future<Either<Failure, (UserEntity, SessionEntity)>> validateSession();

  /// Request password reset
  Future<Either<Failure, void>> forgotPassword(String email);

  /// Reset password with token
  Future<Either<Failure, void>> resetPassword(String token, String newPassword);

  /// Change password for authenticated user
  Future<Either<Failure, void>> changePassword(String oldPassword, String newPassword);

  // ============ PIN Mode ============

  /// Check if PIN is configured
  Future<bool> isPinConfigured();

  /// Setup a new PIN
  Future<Either<Failure, void>> setupPin(String pin);

  /// Unlock with PIN (returns cached user)
  Future<Either<Failure, UserEntity>> unlockWithPin(String pin);

  /// Clear PIN
  Future<Either<Failure, void>> clearPin();

  // ============ Session State ============

  /// Check if user has a valid session
  Future<bool> hasValidSession();

  /// Get currently authenticated user
  Future<UserEntity?> getCurrentUser();

  /// Get current session ID
  Future<String?> getSessionId();
}
