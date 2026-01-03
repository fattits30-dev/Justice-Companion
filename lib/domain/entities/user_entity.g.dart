// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'user_entity.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_$UserEntityImpl _$$UserEntityImplFromJson(Map<String, dynamic> json) =>
    _$UserEntityImpl(
      id: (json['id'] as num).toInt(),
      username: json['username'] as String,
      email: json['email'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
      role: json['role'] as String? ?? 'user',
      isActive: json['isActive'] as bool? ?? true,
      createdAt: json['createdAt'] == null
          ? null
          : DateTime.parse(json['createdAt'] as String),
      lastLoginAt: json['lastLoginAt'] == null
          ? null
          : DateTime.parse(json['lastLoginAt'] as String),
    );

Map<String, dynamic> _$$UserEntityImplToJson(_$UserEntityImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'username': instance.username,
      'email': instance.email,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
      'role': instance.role,
      'isActive': instance.isActive,
      'createdAt': instance.createdAt?.toIso8601String(),
      'lastLoginAt': instance.lastLoginAt?.toIso8601String(),
    };

_$SessionEntityImpl _$$SessionEntityImplFromJson(Map<String, dynamic> json) =>
    _$SessionEntityImpl(
      id: json['id'] as String,
      userId: (json['userId'] as num).toInt(),
      expiresAt: DateTime.parse(json['expiresAt'] as String),
      ipAddress: json['ipAddress'] as String?,
      userAgent: json['userAgent'] as String?,
      rememberMe: json['rememberMe'] as bool? ?? false,
    );

Map<String, dynamic> _$$SessionEntityImplToJson(_$SessionEntityImpl instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'expiresAt': instance.expiresAt.toIso8601String(),
      'ipAddress': instance.ipAddress,
      'userAgent': instance.userAgent,
      'rememberMe': instance.rememberMe,
    };

_$LoginInputImpl _$$LoginInputImplFromJson(Map<String, dynamic> json) =>
    _$LoginInputImpl(
      identifier: json['identifier'] as String,
      password: json['password'] as String,
      rememberMe: json['rememberMe'] as bool? ?? false,
    );

Map<String, dynamic> _$$LoginInputImplToJson(_$LoginInputImpl instance) =>
    <String, dynamic>{
      'identifier': instance.identifier,
      'password': instance.password,
      'rememberMe': instance.rememberMe,
    };

_$RegisterInputImpl _$$RegisterInputImplFromJson(Map<String, dynamic> json) =>
    _$RegisterInputImpl(
      username: json['username'] as String,
      email: json['email'] as String,
      password: json['password'] as String,
      firstName: json['firstName'] as String?,
      lastName: json['lastName'] as String?,
    );

Map<String, dynamic> _$$RegisterInputImplToJson(_$RegisterInputImpl instance) =>
    <String, dynamic>{
      'username': instance.username,
      'email': instance.email,
      'password': instance.password,
      'firstName': instance.firstName,
      'lastName': instance.lastName,
    };
