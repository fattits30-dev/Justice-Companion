/// Base failure class for error handling
/// Uses the Either pattern from dartz for type-safe error handling
abstract class Failure {
  final String message;
  final String? code;
  final dynamic originalError;

  const Failure(this.message, {this.code, this.originalError});

  @override
  String toString() => 'Failure: $message${code != null ? ' ($code)' : ''}';

  @override
  bool operator ==(Object other) =>
      identical(this, other) ||
      other is Failure &&
          runtimeType == other.runtimeType &&
          message == other.message &&
          code == other.code;

  @override
  int get hashCode => message.hashCode ^ code.hashCode;
}

/// Server-side error (5xx responses, timeouts)
class ServerFailure extends Failure {
  const ServerFailure(super.message, {super.code, super.originalError});

  factory ServerFailure.timeout() =>
      const ServerFailure('Request timed out. Please try again.', code: 'TIMEOUT');

  factory ServerFailure.internalError() =>
      const ServerFailure('Server error. Please try again later.', code: 'INTERNAL');
}

/// Network connectivity error
class NetworkFailure extends Failure {
  const NetworkFailure(super.message, {super.code, super.originalError});

  factory NetworkFailure.noConnection() =>
      const NetworkFailure('No internet connection.', code: 'NO_CONNECTION');

  factory NetworkFailure.connectionLost() =>
      const NetworkFailure('Connection lost. Please check your network.', code: 'LOST');
}

/// Authentication/authorization error (401, 403)
class AuthenticationFailure extends Failure {
  const AuthenticationFailure(super.message, {super.code, super.originalError});

  factory AuthenticationFailure.invalidCredentials() =>
      const AuthenticationFailure('Invalid username or password.', code: 'INVALID_CREDENTIALS');

  factory AuthenticationFailure.sessionExpired() =>
      const AuthenticationFailure('Your session has expired. Please login again.', code: 'SESSION_EXPIRED');

  factory AuthenticationFailure.unauthorized() =>
      const AuthenticationFailure('You are not authorized to perform this action.', code: 'UNAUTHORIZED');

  factory AuthenticationFailure.accountLocked() =>
      const AuthenticationFailure('Account temporarily locked. Try again later.', code: 'ACCOUNT_LOCKED');

  factory AuthenticationFailure.invalidPin() =>
      const AuthenticationFailure('Invalid PIN.', code: 'INVALID_PIN');
}

/// Validation error (400 responses, form errors)
class ValidationFailure extends Failure {
  final Map<String, List<String>>? fieldErrors;

  const ValidationFailure(
    super.message, {
    super.code,
    super.originalError,
    this.fieldErrors,
  });

  factory ValidationFailure.emailExists() =>
      const ValidationFailure('Email already registered.', code: 'EMAIL_EXISTS');

  factory ValidationFailure.usernameExists() =>
      const ValidationFailure('Username already taken.', code: 'USERNAME_EXISTS');

  factory ValidationFailure.weakPassword() =>
      const ValidationFailure(
        'Password must be at least 12 characters with uppercase, lowercase, and number.',
        code: 'WEAK_PASSWORD',
      );

  factory ValidationFailure.invalidEmail() =>
      const ValidationFailure('Please enter a valid email address.', code: 'INVALID_EMAIL');

  factory ValidationFailure.passwordMismatch() =>
      const ValidationFailure('Passwords do not match.', code: 'PASSWORD_MISMATCH');

  factory ValidationFailure.invalidToken() =>
      const ValidationFailure('Invalid or expired reset token.', code: 'INVALID_TOKEN');

  factory ValidationFailure.fromFieldErrors(Map<String, List<String>> errors) {
    final firstError = errors.values.firstOrNull?.firstOrNull ?? 'Validation failed';
    return ValidationFailure(firstError, code: 'FIELD_ERROR', fieldErrors: errors);
  }
}

/// Local cache/storage error
class CacheFailure extends Failure {
  const CacheFailure(super.message, {super.code, super.originalError});

  factory CacheFailure.notFound() =>
      const CacheFailure('Data not found in cache.', code: 'NOT_FOUND');

  factory CacheFailure.writeError() =>
      const CacheFailure('Failed to save data.', code: 'WRITE_ERROR');

  factory CacheFailure.readError() =>
      const CacheFailure('Failed to read data.', code: 'READ_ERROR');

  factory CacheFailure.clearError() =>
      const CacheFailure('Failed to clear cache.', code: 'CLEAR_ERROR');
}

/// Rate limiting error (429)
class RateLimitFailure extends Failure {
  final Duration? retryAfter;

  const RateLimitFailure(
    super.message, {
    super.code,
    super.originalError,
    this.retryAfter,
  });

  factory RateLimitFailure.tooManyRequests({Duration? retryAfter}) =>
      RateLimitFailure(
        'Too many requests. Please wait before trying again.',
        code: 'RATE_LIMITED',
        retryAfter: retryAfter,
      );
}

/// Not found error (404)
class NotFoundFailure extends Failure {
  const NotFoundFailure(super.message, {super.code, super.originalError});

  factory NotFoundFailure.resource(String resource) =>
      NotFoundFailure('$resource not found.', code: 'NOT_FOUND');

  factory NotFoundFailure.user() =>
      const NotFoundFailure('User not found.', code: 'USER_NOT_FOUND');

  factory NotFoundFailure.session() =>
      const NotFoundFailure('Session not found or expired.', code: 'SESSION_NOT_FOUND');
}
