import 'package:freezed_annotation/freezed_annotation.dart';

part 'user_entity.freezed.dart';
part 'user_entity.g.dart';

/// User entity representing an authenticated user
@freezed
class UserEntity with _$UserEntity {
  const factory UserEntity({
    required int id,
    required String username,
    required String email,
    String? firstName,
    String? lastName,
    @Default('user') String role,
    @Default(true) bool isActive,
    DateTime? createdAt,
    DateTime? lastLoginAt,
  }) = _UserEntity;

  factory UserEntity.fromJson(Map<String, dynamic> json) =>
      _$UserEntityFromJson(json);
}

/// Session entity representing an authenticated session
@freezed
class SessionEntity with _$SessionEntity {
  const factory SessionEntity({
    required String id,
    required int userId,
    required DateTime expiresAt,
    String? ipAddress,
    String? userAgent,
    @Default(false) bool rememberMe,
  }) = _SessionEntity;

  factory SessionEntity.fromJson(Map<String, dynamic> json) =>
      _$SessionEntityFromJson(json);
}

/// Input for user login
@freezed
class LoginInput with _$LoginInput {
  const factory LoginInput({
    required String identifier, // username or email
    required String password,
    @Default(false) bool rememberMe,
  }) = _LoginInput;

  factory LoginInput.fromJson(Map<String, dynamic> json) =>
      _$LoginInputFromJson(json);
}

/// Input for user registration
@freezed
class RegisterInput with _$RegisterInput {
  const factory RegisterInput({
    required String username,
    required String email,
    required String password,
    String? firstName,
    String? lastName,
  }) = _RegisterInput;

  factory RegisterInput.fromJson(Map<String, dynamic> json) =>
      _$RegisterInputFromJson(json);
}
