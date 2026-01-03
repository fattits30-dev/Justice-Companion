import 'package:justice_companion/data/models/auth_models.dart';
import 'package:justice_companion/domain/entities/user_entity.dart';

/// Test fixtures for authentication tests
class AuthFixtures {
  static final DateTime testDate = DateTime(2024, 1, 1, 12, 0, 0);
  // Use a date 1 year from now to ensure it's always in the future
  static final DateTime futureDate = DateTime.now().add(const Duration(days: 365));
  static final DateTime pastDate = DateTime(2023, 1, 1, 12, 0, 0);

  // ============ User Fixtures ============

  static UserDto get testUserDto => UserDto(
        id: 1,
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        isActive: true,
        createdAt: testDate,
      );

  static UserDto get adminUserDto => UserDto(
        id: 2,
        username: 'admin',
        email: 'admin@example.com',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        isActive: true,
        createdAt: testDate,
      );

  static UserEntity get testUserEntity => testUserDto.toEntity();

  // ============ Session Fixtures ============

  static SessionDto get validSessionDto => SessionDto(
        id: 'sess_valid_123',
        userId: 1,
        expiresAt: futureDate,
        ipAddress: '127.0.0.1',
        userAgent: 'Flutter Test',
        rememberMe: false,
      );

  static SessionDto get expiredSessionDto => SessionDto(
        id: 'sess_expired_456',
        userId: 1,
        expiresAt: pastDate,
        ipAddress: '127.0.0.1',
        userAgent: 'Flutter Test',
        rememberMe: false,
      );

  static SessionDto get rememberMeSessionDto => SessionDto(
        id: 'sess_remember_789',
        userId: 1,
        expiresAt: futureDate,
        ipAddress: '127.0.0.1',
        userAgent: 'Flutter Test',
        rememberMe: true,
      );

  static SessionEntity get validSessionEntity => validSessionDto.toEntity();

  // ============ Auth Response Fixtures ============

  static AuthResponseDto get successAuthResponse => AuthResponseDto(
        user: testUserDto,
        session: validSessionDto,
      );

  static AuthResponseDto get adminAuthResponse => AuthResponseDto(
        user: adminUserDto,
        session: validSessionDto,
      );

  // ============ Input Fixtures ============

  static LoginInput get validLoginInput => const LoginInput(
        identifier: 'testuser',
        password: 'Password123456!',  // 12+ chars required by backend
        rememberMe: false,
      );

  static LoginInput get invalidLoginInput => const LoginInput(
        identifier: 'testuser',
        password: 'wrongpassword1',
        rememberMe: false,
      );

  static RegisterInput get validRegisterInput => const RegisterInput(
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'Password123456!',  // 12+ chars required by backend
        firstName: 'New',
        lastName: 'User',
      );

  static RegisterInput get existingEmailRegisterInput => const RegisterInput(
        username: 'anotheruser',
        email: 'test@example.com', // Already exists
        password: 'Password123!',
      );

  // ============ JSON Fixtures ============

  static Map<String, dynamic> get userJson => {
        'id': 1,
        'username': 'testuser',
        'email': 'test@example.com',
        'first_name': 'Test',
        'last_name': 'User',
        'role': 'user',
        'is_active': true,
        'created_at': testDate.toIso8601String(),
      };

  static Map<String, dynamic> get sessionJson => {
        'id': 'sess_valid_123',
        'user_id': 1,
        'expires_at': futureDate.toIso8601String(),
        'ip_address': '127.0.0.1',
        'user_agent': 'Flutter Test',
        'remember_me': false,
      };

  static Map<String, dynamic> get authResponseJson => {
        'user': userJson,
        'session': sessionJson,
      };

  static Map<String, dynamic> get successResponseJson => {
        'success': true,
        'message': 'Operation successful',
      };

  static Map<String, dynamic> get errorResponseJson => {
        'detail': 'Invalid credentials',
        'code': 'INVALID_CREDENTIALS',
      };

  static Map<String, dynamic> get validationErrorJson => {
        'detail': 'Validation failed',
        'code': 'VALIDATION_ERROR',
        'field_errors': {
          'email': ['Email already exists'],
          'password': ['Password too weak'],
        },
      };
}
