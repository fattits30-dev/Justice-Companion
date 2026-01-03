// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'case_entity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

CaseEntity _$CaseEntityFromJson(Map<String, dynamic> json) {
  return _CaseEntity.fromJson(json);
}

/// @nodoc
mixin _$CaseEntity {
  int get id => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  CaseType get caseType => throw _privateConstructorUsedError;
  CaseStatus get status => throw _privateConstructorUsedError;
  int get userId => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  DateTime get updatedAt => throw _privateConstructorUsedError;

  /// Serializes this CaseEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaseEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaseEntityCopyWith<CaseEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaseEntityCopyWith<$Res> {
  factory $CaseEntityCopyWith(
    CaseEntity value,
    $Res Function(CaseEntity) then,
  ) = _$CaseEntityCopyWithImpl<$Res, CaseEntity>;
  @useResult
  $Res call({
    int id,
    String title,
    String? description,
    CaseType caseType,
    CaseStatus status,
    int userId,
    DateTime createdAt,
    DateTime updatedAt,
  });
}

/// @nodoc
class _$CaseEntityCopyWithImpl<$Res, $Val extends CaseEntity>
    implements $CaseEntityCopyWith<$Res> {
  _$CaseEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaseEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = freezed,
    Object? caseType = null,
    Object? status = null,
    Object? userId = null,
    Object? createdAt = null,
    Object? updatedAt = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            description: freezed == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String?,
            caseType: null == caseType
                ? _value.caseType
                : caseType // ignore: cast_nullable_to_non_nullable
                      as CaseType,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as CaseStatus,
            userId: null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                      as int,
            createdAt: null == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            updatedAt: null == updatedAt
                ? _value.updatedAt
                : updatedAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CaseEntityImplCopyWith<$Res>
    implements $CaseEntityCopyWith<$Res> {
  factory _$$CaseEntityImplCopyWith(
    _$CaseEntityImpl value,
    $Res Function(_$CaseEntityImpl) then,
  ) = __$$CaseEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    String title,
    String? description,
    CaseType caseType,
    CaseStatus status,
    int userId,
    DateTime createdAt,
    DateTime updatedAt,
  });
}

/// @nodoc
class __$$CaseEntityImplCopyWithImpl<$Res>
    extends _$CaseEntityCopyWithImpl<$Res, _$CaseEntityImpl>
    implements _$$CaseEntityImplCopyWith<$Res> {
  __$$CaseEntityImplCopyWithImpl(
    _$CaseEntityImpl _value,
    $Res Function(_$CaseEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CaseEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? title = null,
    Object? description = freezed,
    Object? caseType = null,
    Object? status = null,
    Object? userId = null,
    Object? createdAt = null,
    Object? updatedAt = null,
  }) {
    return _then(
      _$CaseEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        caseType: null == caseType
            ? _value.caseType
            : caseType // ignore: cast_nullable_to_non_nullable
                  as CaseType,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as CaseStatus,
        userId: null == userId
            ? _value.userId
            : userId // ignore: cast_nullable_to_non_nullable
                  as int,
        createdAt: null == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        updatedAt: null == updatedAt
            ? _value.updatedAt
            : updatedAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$CaseEntityImpl implements _CaseEntity {
  const _$CaseEntityImpl({
    required this.id,
    required this.title,
    this.description,
    required this.caseType,
    required this.status,
    required this.userId,
    required this.createdAt,
    required this.updatedAt,
  });

  factory _$CaseEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaseEntityImplFromJson(json);

  @override
  final int id;
  @override
  final String title;
  @override
  final String? description;
  @override
  final CaseType caseType;
  @override
  final CaseStatus status;
  @override
  final int userId;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  @override
  String toString() {
    return 'CaseEntity(id: $id, title: $title, description: $description, caseType: $caseType, status: $status, userId: $userId, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaseEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.caseType, caseType) ||
                other.caseType == caseType) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    title,
    description,
    caseType,
    status,
    userId,
    createdAt,
    updatedAt,
  );

  /// Create a copy of CaseEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaseEntityImplCopyWith<_$CaseEntityImpl> get copyWith =>
      __$$CaseEntityImplCopyWithImpl<_$CaseEntityImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaseEntityImplToJson(this);
  }
}

abstract class _CaseEntity implements CaseEntity {
  const factory _CaseEntity({
    required final int id,
    required final String title,
    final String? description,
    required final CaseType caseType,
    required final CaseStatus status,
    required final int userId,
    required final DateTime createdAt,
    required final DateTime updatedAt,
  }) = _$CaseEntityImpl;

  factory _CaseEntity.fromJson(Map<String, dynamic> json) =
      _$CaseEntityImpl.fromJson;

  @override
  int get id;
  @override
  String get title;
  @override
  String? get description;
  @override
  CaseType get caseType;
  @override
  CaseStatus get status;
  @override
  int get userId;
  @override
  DateTime get createdAt;
  @override
  DateTime get updatedAt;

  /// Create a copy of CaseEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaseEntityImplCopyWith<_$CaseEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CaseCreate _$CaseCreateFromJson(Map<String, dynamic> json) {
  return _CaseCreate.fromJson(json);
}

/// @nodoc
mixin _$CaseCreate {
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  CaseType get caseType => throw _privateConstructorUsedError;
  CaseStatus get status => throw _privateConstructorUsedError;

  /// Serializes this CaseCreate to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaseCreate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaseCreateCopyWith<CaseCreate> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaseCreateCopyWith<$Res> {
  factory $CaseCreateCopyWith(
    CaseCreate value,
    $Res Function(CaseCreate) then,
  ) = _$CaseCreateCopyWithImpl<$Res, CaseCreate>;
  @useResult
  $Res call({
    String title,
    String? description,
    CaseType caseType,
    CaseStatus status,
  });
}

/// @nodoc
class _$CaseCreateCopyWithImpl<$Res, $Val extends CaseCreate>
    implements $CaseCreateCopyWith<$Res> {
  _$CaseCreateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaseCreate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? description = freezed,
    Object? caseType = null,
    Object? status = null,
  }) {
    return _then(
      _value.copyWith(
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            description: freezed == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String?,
            caseType: null == caseType
                ? _value.caseType
                : caseType // ignore: cast_nullable_to_non_nullable
                      as CaseType,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as CaseStatus,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CaseCreateImplCopyWith<$Res>
    implements $CaseCreateCopyWith<$Res> {
  factory _$$CaseCreateImplCopyWith(
    _$CaseCreateImpl value,
    $Res Function(_$CaseCreateImpl) then,
  ) = __$$CaseCreateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String title,
    String? description,
    CaseType caseType,
    CaseStatus status,
  });
}

/// @nodoc
class __$$CaseCreateImplCopyWithImpl<$Res>
    extends _$CaseCreateCopyWithImpl<$Res, _$CaseCreateImpl>
    implements _$$CaseCreateImplCopyWith<$Res> {
  __$$CaseCreateImplCopyWithImpl(
    _$CaseCreateImpl _value,
    $Res Function(_$CaseCreateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CaseCreate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = null,
    Object? description = freezed,
    Object? caseType = null,
    Object? status = null,
  }) {
    return _then(
      _$CaseCreateImpl(
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        caseType: null == caseType
            ? _value.caseType
            : caseType // ignore: cast_nullable_to_non_nullable
                  as CaseType,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as CaseStatus,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$CaseCreateImpl implements _CaseCreate {
  const _$CaseCreateImpl({
    required this.title,
    this.description,
    required this.caseType,
    this.status = CaseStatus.active,
  });

  factory _$CaseCreateImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaseCreateImplFromJson(json);

  @override
  final String title;
  @override
  final String? description;
  @override
  final CaseType caseType;
  @override
  @JsonKey()
  final CaseStatus status;

  @override
  String toString() {
    return 'CaseCreate(title: $title, description: $description, caseType: $caseType, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaseCreateImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.caseType, caseType) ||
                other.caseType == caseType) &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, title, description, caseType, status);

  /// Create a copy of CaseCreate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaseCreateImplCopyWith<_$CaseCreateImpl> get copyWith =>
      __$$CaseCreateImplCopyWithImpl<_$CaseCreateImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaseCreateImplToJson(this);
  }
}

abstract class _CaseCreate implements CaseCreate {
  const factory _CaseCreate({
    required final String title,
    final String? description,
    required final CaseType caseType,
    final CaseStatus status,
  }) = _$CaseCreateImpl;

  factory _CaseCreate.fromJson(Map<String, dynamic> json) =
      _$CaseCreateImpl.fromJson;

  @override
  String get title;
  @override
  String? get description;
  @override
  CaseType get caseType;
  @override
  CaseStatus get status;

  /// Create a copy of CaseCreate
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaseCreateImplCopyWith<_$CaseCreateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

CaseUpdate _$CaseUpdateFromJson(Map<String, dynamic> json) {
  return _CaseUpdate.fromJson(json);
}

/// @nodoc
mixin _$CaseUpdate {
  String? get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  CaseType? get caseType => throw _privateConstructorUsedError;
  CaseStatus? get status => throw _privateConstructorUsedError;

  /// Serializes this CaseUpdate to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of CaseUpdate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $CaseUpdateCopyWith<CaseUpdate> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $CaseUpdateCopyWith<$Res> {
  factory $CaseUpdateCopyWith(
    CaseUpdate value,
    $Res Function(CaseUpdate) then,
  ) = _$CaseUpdateCopyWithImpl<$Res, CaseUpdate>;
  @useResult
  $Res call({
    String? title,
    String? description,
    CaseType? caseType,
    CaseStatus? status,
  });
}

/// @nodoc
class _$CaseUpdateCopyWithImpl<$Res, $Val extends CaseUpdate>
    implements $CaseUpdateCopyWith<$Res> {
  _$CaseUpdateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of CaseUpdate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = freezed,
    Object? description = freezed,
    Object? caseType = freezed,
    Object? status = freezed,
  }) {
    return _then(
      _value.copyWith(
            title: freezed == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String?,
            description: freezed == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String?,
            caseType: freezed == caseType
                ? _value.caseType
                : caseType // ignore: cast_nullable_to_non_nullable
                      as CaseType?,
            status: freezed == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as CaseStatus?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$CaseUpdateImplCopyWith<$Res>
    implements $CaseUpdateCopyWith<$Res> {
  factory _$$CaseUpdateImplCopyWith(
    _$CaseUpdateImpl value,
    $Res Function(_$CaseUpdateImpl) then,
  ) = __$$CaseUpdateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String? title,
    String? description,
    CaseType? caseType,
    CaseStatus? status,
  });
}

/// @nodoc
class __$$CaseUpdateImplCopyWithImpl<$Res>
    extends _$CaseUpdateCopyWithImpl<$Res, _$CaseUpdateImpl>
    implements _$$CaseUpdateImplCopyWith<$Res> {
  __$$CaseUpdateImplCopyWithImpl(
    _$CaseUpdateImpl _value,
    $Res Function(_$CaseUpdateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of CaseUpdate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = freezed,
    Object? description = freezed,
    Object? caseType = freezed,
    Object? status = freezed,
  }) {
    return _then(
      _$CaseUpdateImpl(
        title: freezed == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String?,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        caseType: freezed == caseType
            ? _value.caseType
            : caseType // ignore: cast_nullable_to_non_nullable
                  as CaseType?,
        status: freezed == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as CaseStatus?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$CaseUpdateImpl implements _CaseUpdate {
  const _$CaseUpdateImpl({
    this.title,
    this.description,
    this.caseType,
    this.status,
  });

  factory _$CaseUpdateImpl.fromJson(Map<String, dynamic> json) =>
      _$$CaseUpdateImplFromJson(json);

  @override
  final String? title;
  @override
  final String? description;
  @override
  final CaseType? caseType;
  @override
  final CaseStatus? status;

  @override
  String toString() {
    return 'CaseUpdate(title: $title, description: $description, caseType: $caseType, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$CaseUpdateImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.caseType, caseType) ||
                other.caseType == caseType) &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, title, description, caseType, status);

  /// Create a copy of CaseUpdate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$CaseUpdateImplCopyWith<_$CaseUpdateImpl> get copyWith =>
      __$$CaseUpdateImplCopyWithImpl<_$CaseUpdateImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$CaseUpdateImplToJson(this);
  }
}

abstract class _CaseUpdate implements CaseUpdate {
  const factory _CaseUpdate({
    final String? title,
    final String? description,
    final CaseType? caseType,
    final CaseStatus? status,
  }) = _$CaseUpdateImpl;

  factory _CaseUpdate.fromJson(Map<String, dynamic> json) =
      _$CaseUpdateImpl.fromJson;

  @override
  String? get title;
  @override
  String? get description;
  @override
  CaseType? get caseType;
  @override
  CaseStatus? get status;

  /// Create a copy of CaseUpdate
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$CaseUpdateImplCopyWith<_$CaseUpdateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
