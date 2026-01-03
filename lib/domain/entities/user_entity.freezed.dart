// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'user_entity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

UserEntity _$UserEntityFromJson(Map<String, dynamic> json) {
  return _UserEntity.fromJson(json);
}

/// @nodoc
mixin _$UserEntity {
  int get id => throw _privateConstructorUsedError;
  String get username => throw _privateConstructorUsedError;
  String get email => throw _privateConstructorUsedError;
  String? get firstName => throw _privateConstructorUsedError;
  String? get lastName => throw _privateConstructorUsedError;
  String get role => throw _privateConstructorUsedError;
  bool get isActive => throw _privateConstructorUsedError;
  DateTime? get createdAt => throw _privateConstructorUsedError;
  DateTime? get lastLoginAt => throw _privateConstructorUsedError;

  /// Serializes this UserEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of UserEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $UserEntityCopyWith<UserEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $UserEntityCopyWith<$Res> {
  factory $UserEntityCopyWith(
    UserEntity value,
    $Res Function(UserEntity) then,
  ) = _$UserEntityCopyWithImpl<$Res, UserEntity>;
  @useResult
  $Res call({
    int id,
    String username,
    String email,
    String? firstName,
    String? lastName,
    String role,
    bool isActive,
    DateTime? createdAt,
    DateTime? lastLoginAt,
  });
}

/// @nodoc
class _$UserEntityCopyWithImpl<$Res, $Val extends UserEntity>
    implements $UserEntityCopyWith<$Res> {
  _$UserEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of UserEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? username = null,
    Object? email = null,
    Object? firstName = freezed,
    Object? lastName = freezed,
    Object? role = null,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? lastLoginAt = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            username: null == username
                ? _value.username
                : username // ignore: cast_nullable_to_non_nullable
                      as String,
            email: null == email
                ? _value.email
                : email // ignore: cast_nullable_to_non_nullable
                      as String,
            firstName: freezed == firstName
                ? _value.firstName
                : firstName // ignore: cast_nullable_to_non_nullable
                      as String?,
            lastName: freezed == lastName
                ? _value.lastName
                : lastName // ignore: cast_nullable_to_non_nullable
                      as String?,
            role: null == role
                ? _value.role
                : role // ignore: cast_nullable_to_non_nullable
                      as String,
            isActive: null == isActive
                ? _value.isActive
                : isActive // ignore: cast_nullable_to_non_nullable
                      as bool,
            createdAt: freezed == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            lastLoginAt: freezed == lastLoginAt
                ? _value.lastLoginAt
                : lastLoginAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$UserEntityImplCopyWith<$Res>
    implements $UserEntityCopyWith<$Res> {
  factory _$$UserEntityImplCopyWith(
    _$UserEntityImpl value,
    $Res Function(_$UserEntityImpl) then,
  ) = __$$UserEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    String username,
    String email,
    String? firstName,
    String? lastName,
    String role,
    bool isActive,
    DateTime? createdAt,
    DateTime? lastLoginAt,
  });
}

/// @nodoc
class __$$UserEntityImplCopyWithImpl<$Res>
    extends _$UserEntityCopyWithImpl<$Res, _$UserEntityImpl>
    implements _$$UserEntityImplCopyWith<$Res> {
  __$$UserEntityImplCopyWithImpl(
    _$UserEntityImpl _value,
    $Res Function(_$UserEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of UserEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? username = null,
    Object? email = null,
    Object? firstName = freezed,
    Object? lastName = freezed,
    Object? role = null,
    Object? isActive = null,
    Object? createdAt = freezed,
    Object? lastLoginAt = freezed,
  }) {
    return _then(
      _$UserEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        username: null == username
            ? _value.username
            : username // ignore: cast_nullable_to_non_nullable
                  as String,
        email: null == email
            ? _value.email
            : email // ignore: cast_nullable_to_non_nullable
                  as String,
        firstName: freezed == firstName
            ? _value.firstName
            : firstName // ignore: cast_nullable_to_non_nullable
                  as String?,
        lastName: freezed == lastName
            ? _value.lastName
            : lastName // ignore: cast_nullable_to_non_nullable
                  as String?,
        role: null == role
            ? _value.role
            : role // ignore: cast_nullable_to_non_nullable
                  as String,
        isActive: null == isActive
            ? _value.isActive
            : isActive // ignore: cast_nullable_to_non_nullable
                  as bool,
        createdAt: freezed == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        lastLoginAt: freezed == lastLoginAt
            ? _value.lastLoginAt
            : lastLoginAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$UserEntityImpl implements _UserEntity {
  const _$UserEntityImpl({
    required this.id,
    required this.username,
    required this.email,
    this.firstName,
    this.lastName,
    this.role = 'user',
    this.isActive = true,
    this.createdAt,
    this.lastLoginAt,
  });

  factory _$UserEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$UserEntityImplFromJson(json);

  @override
  final int id;
  @override
  final String username;
  @override
  final String email;
  @override
  final String? firstName;
  @override
  final String? lastName;
  @override
  @JsonKey()
  final String role;
  @override
  @JsonKey()
  final bool isActive;
  @override
  final DateTime? createdAt;
  @override
  final DateTime? lastLoginAt;

  @override
  String toString() {
    return 'UserEntity(id: $id, username: $username, email: $email, firstName: $firstName, lastName: $lastName, role: $role, isActive: $isActive, createdAt: $createdAt, lastLoginAt: $lastLoginAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$UserEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.username, username) ||
                other.username == username) &&
            (identical(other.email, email) || other.email == email) &&
            (identical(other.firstName, firstName) ||
                other.firstName == firstName) &&
            (identical(other.lastName, lastName) ||
                other.lastName == lastName) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.isActive, isActive) ||
                other.isActive == isActive) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.lastLoginAt, lastLoginAt) ||
                other.lastLoginAt == lastLoginAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    username,
    email,
    firstName,
    lastName,
    role,
    isActive,
    createdAt,
    lastLoginAt,
  );

  /// Create a copy of UserEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$UserEntityImplCopyWith<_$UserEntityImpl> get copyWith =>
      __$$UserEntityImplCopyWithImpl<_$UserEntityImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$UserEntityImplToJson(this);
  }
}

abstract class _UserEntity implements UserEntity {
  const factory _UserEntity({
    required final int id,
    required final String username,
    required final String email,
    final String? firstName,
    final String? lastName,
    final String role,
    final bool isActive,
    final DateTime? createdAt,
    final DateTime? lastLoginAt,
  }) = _$UserEntityImpl;

  factory _UserEntity.fromJson(Map<String, dynamic> json) =
      _$UserEntityImpl.fromJson;

  @override
  int get id;
  @override
  String get username;
  @override
  String get email;
  @override
  String? get firstName;
  @override
  String? get lastName;
  @override
  String get role;
  @override
  bool get isActive;
  @override
  DateTime? get createdAt;
  @override
  DateTime? get lastLoginAt;

  /// Create a copy of UserEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$UserEntityImplCopyWith<_$UserEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

SessionEntity _$SessionEntityFromJson(Map<String, dynamic> json) {
  return _SessionEntity.fromJson(json);
}

/// @nodoc
mixin _$SessionEntity {
  String get id => throw _privateConstructorUsedError;
  int get userId => throw _privateConstructorUsedError;
  DateTime get expiresAt => throw _privateConstructorUsedError;
  String? get ipAddress => throw _privateConstructorUsedError;
  String? get userAgent => throw _privateConstructorUsedError;
  bool get rememberMe => throw _privateConstructorUsedError;

  /// Serializes this SessionEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of SessionEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $SessionEntityCopyWith<SessionEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $SessionEntityCopyWith<$Res> {
  factory $SessionEntityCopyWith(
    SessionEntity value,
    $Res Function(SessionEntity) then,
  ) = _$SessionEntityCopyWithImpl<$Res, SessionEntity>;
  @useResult
  $Res call({
    String id,
    int userId,
    DateTime expiresAt,
    String? ipAddress,
    String? userAgent,
    bool rememberMe,
  });
}

/// @nodoc
class _$SessionEntityCopyWithImpl<$Res, $Val extends SessionEntity>
    implements $SessionEntityCopyWith<$Res> {
  _$SessionEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of SessionEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? expiresAt = null,
    Object? ipAddress = freezed,
    Object? userAgent = freezed,
    Object? rememberMe = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as String,
            userId: null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                      as int,
            expiresAt: null == expiresAt
                ? _value.expiresAt
                : expiresAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            ipAddress: freezed == ipAddress
                ? _value.ipAddress
                : ipAddress // ignore: cast_nullable_to_non_nullable
                      as String?,
            userAgent: freezed == userAgent
                ? _value.userAgent
                : userAgent // ignore: cast_nullable_to_non_nullable
                      as String?,
            rememberMe: null == rememberMe
                ? _value.rememberMe
                : rememberMe // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$SessionEntityImplCopyWith<$Res>
    implements $SessionEntityCopyWith<$Res> {
  factory _$$SessionEntityImplCopyWith(
    _$SessionEntityImpl value,
    $Res Function(_$SessionEntityImpl) then,
  ) = __$$SessionEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String id,
    int userId,
    DateTime expiresAt,
    String? ipAddress,
    String? userAgent,
    bool rememberMe,
  });
}

/// @nodoc
class __$$SessionEntityImplCopyWithImpl<$Res>
    extends _$SessionEntityCopyWithImpl<$Res, _$SessionEntityImpl>
    implements _$$SessionEntityImplCopyWith<$Res> {
  __$$SessionEntityImplCopyWithImpl(
    _$SessionEntityImpl _value,
    $Res Function(_$SessionEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of SessionEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? expiresAt = null,
    Object? ipAddress = freezed,
    Object? userAgent = freezed,
    Object? rememberMe = null,
  }) {
    return _then(
      _$SessionEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as String,
        userId: null == userId
            ? _value.userId
            : userId // ignore: cast_nullable_to_non_nullable
                  as int,
        expiresAt: null == expiresAt
            ? _value.expiresAt
            : expiresAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        ipAddress: freezed == ipAddress
            ? _value.ipAddress
            : ipAddress // ignore: cast_nullable_to_non_nullable
                  as String?,
        userAgent: freezed == userAgent
            ? _value.userAgent
            : userAgent // ignore: cast_nullable_to_non_nullable
                  as String?,
        rememberMe: null == rememberMe
            ? _value.rememberMe
            : rememberMe // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$SessionEntityImpl implements _SessionEntity {
  const _$SessionEntityImpl({
    required this.id,
    required this.userId,
    required this.expiresAt,
    this.ipAddress,
    this.userAgent,
    this.rememberMe = false,
  });

  factory _$SessionEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$SessionEntityImplFromJson(json);

  @override
  final String id;
  @override
  final int userId;
  @override
  final DateTime expiresAt;
  @override
  final String? ipAddress;
  @override
  final String? userAgent;
  @override
  @JsonKey()
  final bool rememberMe;

  @override
  String toString() {
    return 'SessionEntity(id: $id, userId: $userId, expiresAt: $expiresAt, ipAddress: $ipAddress, userAgent: $userAgent, rememberMe: $rememberMe)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$SessionEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.expiresAt, expiresAt) ||
                other.expiresAt == expiresAt) &&
            (identical(other.ipAddress, ipAddress) ||
                other.ipAddress == ipAddress) &&
            (identical(other.userAgent, userAgent) ||
                other.userAgent == userAgent) &&
            (identical(other.rememberMe, rememberMe) ||
                other.rememberMe == rememberMe));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    userId,
    expiresAt,
    ipAddress,
    userAgent,
    rememberMe,
  );

  /// Create a copy of SessionEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$SessionEntityImplCopyWith<_$SessionEntityImpl> get copyWith =>
      __$$SessionEntityImplCopyWithImpl<_$SessionEntityImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$SessionEntityImplToJson(this);
  }
}

abstract class _SessionEntity implements SessionEntity {
  const factory _SessionEntity({
    required final String id,
    required final int userId,
    required final DateTime expiresAt,
    final String? ipAddress,
    final String? userAgent,
    final bool rememberMe,
  }) = _$SessionEntityImpl;

  factory _SessionEntity.fromJson(Map<String, dynamic> json) =
      _$SessionEntityImpl.fromJson;

  @override
  String get id;
  @override
  int get userId;
  @override
  DateTime get expiresAt;
  @override
  String? get ipAddress;
  @override
  String? get userAgent;
  @override
  bool get rememberMe;

  /// Create a copy of SessionEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$SessionEntityImplCopyWith<_$SessionEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

LoginInput _$LoginInputFromJson(Map<String, dynamic> json) {
  return _LoginInput.fromJson(json);
}

/// @nodoc
mixin _$LoginInput {
  String get identifier =>
      throw _privateConstructorUsedError; // username or email
  String get password => throw _privateConstructorUsedError;
  bool get rememberMe => throw _privateConstructorUsedError;

  /// Serializes this LoginInput to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of LoginInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $LoginInputCopyWith<LoginInput> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $LoginInputCopyWith<$Res> {
  factory $LoginInputCopyWith(
    LoginInput value,
    $Res Function(LoginInput) then,
  ) = _$LoginInputCopyWithImpl<$Res, LoginInput>;
  @useResult
  $Res call({String identifier, String password, bool rememberMe});
}

/// @nodoc
class _$LoginInputCopyWithImpl<$Res, $Val extends LoginInput>
    implements $LoginInputCopyWith<$Res> {
  _$LoginInputCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of LoginInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? identifier = null,
    Object? password = null,
    Object? rememberMe = null,
  }) {
    return _then(
      _value.copyWith(
            identifier: null == identifier
                ? _value.identifier
                : identifier // ignore: cast_nullable_to_non_nullable
                      as String,
            password: null == password
                ? _value.password
                : password // ignore: cast_nullable_to_non_nullable
                      as String,
            rememberMe: null == rememberMe
                ? _value.rememberMe
                : rememberMe // ignore: cast_nullable_to_non_nullable
                      as bool,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$LoginInputImplCopyWith<$Res>
    implements $LoginInputCopyWith<$Res> {
  factory _$$LoginInputImplCopyWith(
    _$LoginInputImpl value,
    $Res Function(_$LoginInputImpl) then,
  ) = __$$LoginInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({String identifier, String password, bool rememberMe});
}

/// @nodoc
class __$$LoginInputImplCopyWithImpl<$Res>
    extends _$LoginInputCopyWithImpl<$Res, _$LoginInputImpl>
    implements _$$LoginInputImplCopyWith<$Res> {
  __$$LoginInputImplCopyWithImpl(
    _$LoginInputImpl _value,
    $Res Function(_$LoginInputImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of LoginInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? identifier = null,
    Object? password = null,
    Object? rememberMe = null,
  }) {
    return _then(
      _$LoginInputImpl(
        identifier: null == identifier
            ? _value.identifier
            : identifier // ignore: cast_nullable_to_non_nullable
                  as String,
        password: null == password
            ? _value.password
            : password // ignore: cast_nullable_to_non_nullable
                  as String,
        rememberMe: null == rememberMe
            ? _value.rememberMe
            : rememberMe // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$LoginInputImpl implements _LoginInput {
  const _$LoginInputImpl({
    required this.identifier,
    required this.password,
    this.rememberMe = false,
  });

  factory _$LoginInputImpl.fromJson(Map<String, dynamic> json) =>
      _$$LoginInputImplFromJson(json);

  @override
  final String identifier;
  // username or email
  @override
  final String password;
  @override
  @JsonKey()
  final bool rememberMe;

  @override
  String toString() {
    return 'LoginInput(identifier: $identifier, password: $password, rememberMe: $rememberMe)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$LoginInputImpl &&
            (identical(other.identifier, identifier) ||
                other.identifier == identifier) &&
            (identical(other.password, password) ||
                other.password == password) &&
            (identical(other.rememberMe, rememberMe) ||
                other.rememberMe == rememberMe));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, identifier, password, rememberMe);

  /// Create a copy of LoginInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$LoginInputImplCopyWith<_$LoginInputImpl> get copyWith =>
      __$$LoginInputImplCopyWithImpl<_$LoginInputImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$LoginInputImplToJson(this);
  }
}

abstract class _LoginInput implements LoginInput {
  const factory _LoginInput({
    required final String identifier,
    required final String password,
    final bool rememberMe,
  }) = _$LoginInputImpl;

  factory _LoginInput.fromJson(Map<String, dynamic> json) =
      _$LoginInputImpl.fromJson;

  @override
  String get identifier; // username or email
  @override
  String get password;
  @override
  bool get rememberMe;

  /// Create a copy of LoginInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$LoginInputImplCopyWith<_$LoginInputImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

RegisterInput _$RegisterInputFromJson(Map<String, dynamic> json) {
  return _RegisterInput.fromJson(json);
}

/// @nodoc
mixin _$RegisterInput {
  String get username => throw _privateConstructorUsedError;
  String get email => throw _privateConstructorUsedError;
  String get password => throw _privateConstructorUsedError;
  String? get firstName => throw _privateConstructorUsedError;
  String? get lastName => throw _privateConstructorUsedError;

  /// Serializes this RegisterInput to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of RegisterInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $RegisterInputCopyWith<RegisterInput> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $RegisterInputCopyWith<$Res> {
  factory $RegisterInputCopyWith(
    RegisterInput value,
    $Res Function(RegisterInput) then,
  ) = _$RegisterInputCopyWithImpl<$Res, RegisterInput>;
  @useResult
  $Res call({
    String username,
    String email,
    String password,
    String? firstName,
    String? lastName,
  });
}

/// @nodoc
class _$RegisterInputCopyWithImpl<$Res, $Val extends RegisterInput>
    implements $RegisterInputCopyWith<$Res> {
  _$RegisterInputCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of RegisterInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? username = null,
    Object? email = null,
    Object? password = null,
    Object? firstName = freezed,
    Object? lastName = freezed,
  }) {
    return _then(
      _value.copyWith(
            username: null == username
                ? _value.username
                : username // ignore: cast_nullable_to_non_nullable
                      as String,
            email: null == email
                ? _value.email
                : email // ignore: cast_nullable_to_non_nullable
                      as String,
            password: null == password
                ? _value.password
                : password // ignore: cast_nullable_to_non_nullable
                      as String,
            firstName: freezed == firstName
                ? _value.firstName
                : firstName // ignore: cast_nullable_to_non_nullable
                      as String?,
            lastName: freezed == lastName
                ? _value.lastName
                : lastName // ignore: cast_nullable_to_non_nullable
                      as String?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$RegisterInputImplCopyWith<$Res>
    implements $RegisterInputCopyWith<$Res> {
  factory _$$RegisterInputImplCopyWith(
    _$RegisterInputImpl value,
    $Res Function(_$RegisterInputImpl) then,
  ) = __$$RegisterInputImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String username,
    String email,
    String password,
    String? firstName,
    String? lastName,
  });
}

/// @nodoc
class __$$RegisterInputImplCopyWithImpl<$Res>
    extends _$RegisterInputCopyWithImpl<$Res, _$RegisterInputImpl>
    implements _$$RegisterInputImplCopyWith<$Res> {
  __$$RegisterInputImplCopyWithImpl(
    _$RegisterInputImpl _value,
    $Res Function(_$RegisterInputImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of RegisterInput
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? username = null,
    Object? email = null,
    Object? password = null,
    Object? firstName = freezed,
    Object? lastName = freezed,
  }) {
    return _then(
      _$RegisterInputImpl(
        username: null == username
            ? _value.username
            : username // ignore: cast_nullable_to_non_nullable
                  as String,
        email: null == email
            ? _value.email
            : email // ignore: cast_nullable_to_non_nullable
                  as String,
        password: null == password
            ? _value.password
            : password // ignore: cast_nullable_to_non_nullable
                  as String,
        firstName: freezed == firstName
            ? _value.firstName
            : firstName // ignore: cast_nullable_to_non_nullable
                  as String?,
        lastName: freezed == lastName
            ? _value.lastName
            : lastName // ignore: cast_nullable_to_non_nullable
                  as String?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$RegisterInputImpl implements _RegisterInput {
  const _$RegisterInputImpl({
    required this.username,
    required this.email,
    required this.password,
    this.firstName,
    this.lastName,
  });

  factory _$RegisterInputImpl.fromJson(Map<String, dynamic> json) =>
      _$$RegisterInputImplFromJson(json);

  @override
  final String username;
  @override
  final String email;
  @override
  final String password;
  @override
  final String? firstName;
  @override
  final String? lastName;

  @override
  String toString() {
    return 'RegisterInput(username: $username, email: $email, password: $password, firstName: $firstName, lastName: $lastName)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$RegisterInputImpl &&
            (identical(other.username, username) ||
                other.username == username) &&
            (identical(other.email, email) || other.email == email) &&
            (identical(other.password, password) ||
                other.password == password) &&
            (identical(other.firstName, firstName) ||
                other.firstName == firstName) &&
            (identical(other.lastName, lastName) ||
                other.lastName == lastName));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, username, email, password, firstName, lastName);

  /// Create a copy of RegisterInput
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$RegisterInputImplCopyWith<_$RegisterInputImpl> get copyWith =>
      __$$RegisterInputImplCopyWithImpl<_$RegisterInputImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$RegisterInputImplToJson(this);
  }
}

abstract class _RegisterInput implements RegisterInput {
  const factory _RegisterInput({
    required final String username,
    required final String email,
    required final String password,
    final String? firstName,
    final String? lastName,
  }) = _$RegisterInputImpl;

  factory _RegisterInput.fromJson(Map<String, dynamic> json) =
      _$RegisterInputImpl.fromJson;

  @override
  String get username;
  @override
  String get email;
  @override
  String get password;
  @override
  String? get firstName;
  @override
  String? get lastName;

  /// Create a copy of RegisterInput
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$RegisterInputImplCopyWith<_$RegisterInputImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
