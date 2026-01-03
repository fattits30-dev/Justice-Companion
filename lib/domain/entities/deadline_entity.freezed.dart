// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'deadline_entity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

DeadlineEntity _$DeadlineEntityFromJson(Map<String, dynamic> json) {
  return _DeadlineEntity.fromJson(json);
}

/// @nodoc
mixin _$DeadlineEntity {
  int get id => throw _privateConstructorUsedError;
  int get caseId => throw _privateConstructorUsedError;
  int get userId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  DateTime get deadlineDate => throw _privateConstructorUsedError;
  DeadlinePriority get priority => throw _privateConstructorUsedError;
  DeadlineStatus get status => throw _privateConstructorUsedError;
  DateTime? get completedAt => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  DateTime get updatedAt => throw _privateConstructorUsedError;

  /// Serializes this DeadlineEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeadlineEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeadlineEntityCopyWith<DeadlineEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeadlineEntityCopyWith<$Res> {
  factory $DeadlineEntityCopyWith(
    DeadlineEntity value,
    $Res Function(DeadlineEntity) then,
  ) = _$DeadlineEntityCopyWithImpl<$Res, DeadlineEntity>;
  @useResult
  $Res call({
    int id,
    int caseId,
    int userId,
    String title,
    String? description,
    DateTime deadlineDate,
    DeadlinePriority priority,
    DeadlineStatus status,
    DateTime? completedAt,
    DateTime createdAt,
    DateTime updatedAt,
  });
}

/// @nodoc
class _$DeadlineEntityCopyWithImpl<$Res, $Val extends DeadlineEntity>
    implements $DeadlineEntityCopyWith<$Res> {
  _$DeadlineEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeadlineEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? caseId = null,
    Object? userId = null,
    Object? title = null,
    Object? description = freezed,
    Object? deadlineDate = null,
    Object? priority = null,
    Object? status = null,
    Object? completedAt = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            caseId: null == caseId
                ? _value.caseId
                : caseId // ignore: cast_nullable_to_non_nullable
                      as int,
            userId: null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                      as int,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            description: freezed == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String?,
            deadlineDate: null == deadlineDate
                ? _value.deadlineDate
                : deadlineDate // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            priority: null == priority
                ? _value.priority
                : priority // ignore: cast_nullable_to_non_nullable
                      as DeadlinePriority,
            status: null == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as DeadlineStatus,
            completedAt: freezed == completedAt
                ? _value.completedAt
                : completedAt // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
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
abstract class _$$DeadlineEntityImplCopyWith<$Res>
    implements $DeadlineEntityCopyWith<$Res> {
  factory _$$DeadlineEntityImplCopyWith(
    _$DeadlineEntityImpl value,
    $Res Function(_$DeadlineEntityImpl) then,
  ) = __$$DeadlineEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    int caseId,
    int userId,
    String title,
    String? description,
    DateTime deadlineDate,
    DeadlinePriority priority,
    DeadlineStatus status,
    DateTime? completedAt,
    DateTime createdAt,
    DateTime updatedAt,
  });
}

/// @nodoc
class __$$DeadlineEntityImplCopyWithImpl<$Res>
    extends _$DeadlineEntityCopyWithImpl<$Res, _$DeadlineEntityImpl>
    implements _$$DeadlineEntityImplCopyWith<$Res> {
  __$$DeadlineEntityImplCopyWithImpl(
    _$DeadlineEntityImpl _value,
    $Res Function(_$DeadlineEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of DeadlineEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? caseId = null,
    Object? userId = null,
    Object? title = null,
    Object? description = freezed,
    Object? deadlineDate = null,
    Object? priority = null,
    Object? status = null,
    Object? completedAt = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
  }) {
    return _then(
      _$DeadlineEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        caseId: null == caseId
            ? _value.caseId
            : caseId // ignore: cast_nullable_to_non_nullable
                  as int,
        userId: null == userId
            ? _value.userId
            : userId // ignore: cast_nullable_to_non_nullable
                  as int,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        deadlineDate: null == deadlineDate
            ? _value.deadlineDate
            : deadlineDate // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        priority: null == priority
            ? _value.priority
            : priority // ignore: cast_nullable_to_non_nullable
                  as DeadlinePriority,
        status: null == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as DeadlineStatus,
        completedAt: freezed == completedAt
            ? _value.completedAt
            : completedAt // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
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
class _$DeadlineEntityImpl implements _DeadlineEntity {
  const _$DeadlineEntityImpl({
    required this.id,
    required this.caseId,
    required this.userId,
    required this.title,
    this.description,
    required this.deadlineDate,
    required this.priority,
    required this.status,
    this.completedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory _$DeadlineEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeadlineEntityImplFromJson(json);

  @override
  final int id;
  @override
  final int caseId;
  @override
  final int userId;
  @override
  final String title;
  @override
  final String? description;
  @override
  final DateTime deadlineDate;
  @override
  final DeadlinePriority priority;
  @override
  final DeadlineStatus status;
  @override
  final DateTime? completedAt;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  @override
  String toString() {
    return 'DeadlineEntity(id: $id, caseId: $caseId, userId: $userId, title: $title, description: $description, deadlineDate: $deadlineDate, priority: $priority, status: $status, completedAt: $completedAt, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeadlineEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.caseId, caseId) || other.caseId == caseId) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.deadlineDate, deadlineDate) ||
                other.deadlineDate == deadlineDate) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.status, status) || other.status == status) &&
            (identical(other.completedAt, completedAt) ||
                other.completedAt == completedAt) &&
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
    caseId,
    userId,
    title,
    description,
    deadlineDate,
    priority,
    status,
    completedAt,
    createdAt,
    updatedAt,
  );

  /// Create a copy of DeadlineEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeadlineEntityImplCopyWith<_$DeadlineEntityImpl> get copyWith =>
      __$$DeadlineEntityImplCopyWithImpl<_$DeadlineEntityImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$DeadlineEntityImplToJson(this);
  }
}

abstract class _DeadlineEntity implements DeadlineEntity {
  const factory _DeadlineEntity({
    required final int id,
    required final int caseId,
    required final int userId,
    required final String title,
    final String? description,
    required final DateTime deadlineDate,
    required final DeadlinePriority priority,
    required final DeadlineStatus status,
    final DateTime? completedAt,
    required final DateTime createdAt,
    required final DateTime updatedAt,
  }) = _$DeadlineEntityImpl;

  factory _DeadlineEntity.fromJson(Map<String, dynamic> json) =
      _$DeadlineEntityImpl.fromJson;

  @override
  int get id;
  @override
  int get caseId;
  @override
  int get userId;
  @override
  String get title;
  @override
  String? get description;
  @override
  DateTime get deadlineDate;
  @override
  DeadlinePriority get priority;
  @override
  DeadlineStatus get status;
  @override
  DateTime? get completedAt;
  @override
  DateTime get createdAt;
  @override
  DateTime get updatedAt;

  /// Create a copy of DeadlineEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeadlineEntityImplCopyWith<_$DeadlineEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DeadlineCreate _$DeadlineCreateFromJson(Map<String, dynamic> json) {
  return _DeadlineCreate.fromJson(json);
}

/// @nodoc
mixin _$DeadlineCreate {
  int get caseId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  DateTime get deadlineDate => throw _privateConstructorUsedError;
  DeadlinePriority get priority => throw _privateConstructorUsedError;

  /// Serializes this DeadlineCreate to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeadlineCreate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeadlineCreateCopyWith<DeadlineCreate> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeadlineCreateCopyWith<$Res> {
  factory $DeadlineCreateCopyWith(
    DeadlineCreate value,
    $Res Function(DeadlineCreate) then,
  ) = _$DeadlineCreateCopyWithImpl<$Res, DeadlineCreate>;
  @useResult
  $Res call({
    int caseId,
    String title,
    String? description,
    DateTime deadlineDate,
    DeadlinePriority priority,
  });
}

/// @nodoc
class _$DeadlineCreateCopyWithImpl<$Res, $Val extends DeadlineCreate>
    implements $DeadlineCreateCopyWith<$Res> {
  _$DeadlineCreateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeadlineCreate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? caseId = null,
    Object? title = null,
    Object? description = freezed,
    Object? deadlineDate = null,
    Object? priority = null,
  }) {
    return _then(
      _value.copyWith(
            caseId: null == caseId
                ? _value.caseId
                : caseId // ignore: cast_nullable_to_non_nullable
                      as int,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            description: freezed == description
                ? _value.description
                : description // ignore: cast_nullable_to_non_nullable
                      as String?,
            deadlineDate: null == deadlineDate
                ? _value.deadlineDate
                : deadlineDate // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            priority: null == priority
                ? _value.priority
                : priority // ignore: cast_nullable_to_non_nullable
                      as DeadlinePriority,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$DeadlineCreateImplCopyWith<$Res>
    implements $DeadlineCreateCopyWith<$Res> {
  factory _$$DeadlineCreateImplCopyWith(
    _$DeadlineCreateImpl value,
    $Res Function(_$DeadlineCreateImpl) then,
  ) = __$$DeadlineCreateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int caseId,
    String title,
    String? description,
    DateTime deadlineDate,
    DeadlinePriority priority,
  });
}

/// @nodoc
class __$$DeadlineCreateImplCopyWithImpl<$Res>
    extends _$DeadlineCreateCopyWithImpl<$Res, _$DeadlineCreateImpl>
    implements _$$DeadlineCreateImplCopyWith<$Res> {
  __$$DeadlineCreateImplCopyWithImpl(
    _$DeadlineCreateImpl _value,
    $Res Function(_$DeadlineCreateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of DeadlineCreate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? caseId = null,
    Object? title = null,
    Object? description = freezed,
    Object? deadlineDate = null,
    Object? priority = null,
  }) {
    return _then(
      _$DeadlineCreateImpl(
        caseId: null == caseId
            ? _value.caseId
            : caseId // ignore: cast_nullable_to_non_nullable
                  as int,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        deadlineDate: null == deadlineDate
            ? _value.deadlineDate
            : deadlineDate // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        priority: null == priority
            ? _value.priority
            : priority // ignore: cast_nullable_to_non_nullable
                  as DeadlinePriority,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$DeadlineCreateImpl implements _DeadlineCreate {
  const _$DeadlineCreateImpl({
    required this.caseId,
    required this.title,
    this.description,
    required this.deadlineDate,
    this.priority = DeadlinePriority.medium,
  });

  factory _$DeadlineCreateImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeadlineCreateImplFromJson(json);

  @override
  final int caseId;
  @override
  final String title;
  @override
  final String? description;
  @override
  final DateTime deadlineDate;
  @override
  @JsonKey()
  final DeadlinePriority priority;

  @override
  String toString() {
    return 'DeadlineCreate(caseId: $caseId, title: $title, description: $description, deadlineDate: $deadlineDate, priority: $priority)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeadlineCreateImpl &&
            (identical(other.caseId, caseId) || other.caseId == caseId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.deadlineDate, deadlineDate) ||
                other.deadlineDate == deadlineDate) &&
            (identical(other.priority, priority) ||
                other.priority == priority));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    caseId,
    title,
    description,
    deadlineDate,
    priority,
  );

  /// Create a copy of DeadlineCreate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeadlineCreateImplCopyWith<_$DeadlineCreateImpl> get copyWith =>
      __$$DeadlineCreateImplCopyWithImpl<_$DeadlineCreateImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$DeadlineCreateImplToJson(this);
  }
}

abstract class _DeadlineCreate implements DeadlineCreate {
  const factory _DeadlineCreate({
    required final int caseId,
    required final String title,
    final String? description,
    required final DateTime deadlineDate,
    final DeadlinePriority priority,
  }) = _$DeadlineCreateImpl;

  factory _DeadlineCreate.fromJson(Map<String, dynamic> json) =
      _$DeadlineCreateImpl.fromJson;

  @override
  int get caseId;
  @override
  String get title;
  @override
  String? get description;
  @override
  DateTime get deadlineDate;
  @override
  DeadlinePriority get priority;

  /// Create a copy of DeadlineCreate
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeadlineCreateImplCopyWith<_$DeadlineCreateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

DeadlineUpdate _$DeadlineUpdateFromJson(Map<String, dynamic> json) {
  return _DeadlineUpdate.fromJson(json);
}

/// @nodoc
mixin _$DeadlineUpdate {
  String? get title => throw _privateConstructorUsedError;
  String? get description => throw _privateConstructorUsedError;
  DateTime? get deadlineDate => throw _privateConstructorUsedError;
  DeadlinePriority? get priority => throw _privateConstructorUsedError;
  DeadlineStatus? get status => throw _privateConstructorUsedError;

  /// Serializes this DeadlineUpdate to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of DeadlineUpdate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $DeadlineUpdateCopyWith<DeadlineUpdate> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $DeadlineUpdateCopyWith<$Res> {
  factory $DeadlineUpdateCopyWith(
    DeadlineUpdate value,
    $Res Function(DeadlineUpdate) then,
  ) = _$DeadlineUpdateCopyWithImpl<$Res, DeadlineUpdate>;
  @useResult
  $Res call({
    String? title,
    String? description,
    DateTime? deadlineDate,
    DeadlinePriority? priority,
    DeadlineStatus? status,
  });
}

/// @nodoc
class _$DeadlineUpdateCopyWithImpl<$Res, $Val extends DeadlineUpdate>
    implements $DeadlineUpdateCopyWith<$Res> {
  _$DeadlineUpdateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of DeadlineUpdate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = freezed,
    Object? description = freezed,
    Object? deadlineDate = freezed,
    Object? priority = freezed,
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
            deadlineDate: freezed == deadlineDate
                ? _value.deadlineDate
                : deadlineDate // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
            priority: freezed == priority
                ? _value.priority
                : priority // ignore: cast_nullable_to_non_nullable
                      as DeadlinePriority?,
            status: freezed == status
                ? _value.status
                : status // ignore: cast_nullable_to_non_nullable
                      as DeadlineStatus?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$DeadlineUpdateImplCopyWith<$Res>
    implements $DeadlineUpdateCopyWith<$Res> {
  factory _$$DeadlineUpdateImplCopyWith(
    _$DeadlineUpdateImpl value,
    $Res Function(_$DeadlineUpdateImpl) then,
  ) = __$$DeadlineUpdateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String? title,
    String? description,
    DateTime? deadlineDate,
    DeadlinePriority? priority,
    DeadlineStatus? status,
  });
}

/// @nodoc
class __$$DeadlineUpdateImplCopyWithImpl<$Res>
    extends _$DeadlineUpdateCopyWithImpl<$Res, _$DeadlineUpdateImpl>
    implements _$$DeadlineUpdateImplCopyWith<$Res> {
  __$$DeadlineUpdateImplCopyWithImpl(
    _$DeadlineUpdateImpl _value,
    $Res Function(_$DeadlineUpdateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of DeadlineUpdate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = freezed,
    Object? description = freezed,
    Object? deadlineDate = freezed,
    Object? priority = freezed,
    Object? status = freezed,
  }) {
    return _then(
      _$DeadlineUpdateImpl(
        title: freezed == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String?,
        description: freezed == description
            ? _value.description
            : description // ignore: cast_nullable_to_non_nullable
                  as String?,
        deadlineDate: freezed == deadlineDate
            ? _value.deadlineDate
            : deadlineDate // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
        priority: freezed == priority
            ? _value.priority
            : priority // ignore: cast_nullable_to_non_nullable
                  as DeadlinePriority?,
        status: freezed == status
            ? _value.status
            : status // ignore: cast_nullable_to_non_nullable
                  as DeadlineStatus?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$DeadlineUpdateImpl implements _DeadlineUpdate {
  const _$DeadlineUpdateImpl({
    this.title,
    this.description,
    this.deadlineDate,
    this.priority,
    this.status,
  });

  factory _$DeadlineUpdateImpl.fromJson(Map<String, dynamic> json) =>
      _$$DeadlineUpdateImplFromJson(json);

  @override
  final String? title;
  @override
  final String? description;
  @override
  final DateTime? deadlineDate;
  @override
  final DeadlinePriority? priority;
  @override
  final DeadlineStatus? status;

  @override
  String toString() {
    return 'DeadlineUpdate(title: $title, description: $description, deadlineDate: $deadlineDate, priority: $priority, status: $status)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$DeadlineUpdateImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.description, description) ||
                other.description == description) &&
            (identical(other.deadlineDate, deadlineDate) ||
                other.deadlineDate == deadlineDate) &&
            (identical(other.priority, priority) ||
                other.priority == priority) &&
            (identical(other.status, status) || other.status == status));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    title,
    description,
    deadlineDate,
    priority,
    status,
  );

  /// Create a copy of DeadlineUpdate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$DeadlineUpdateImplCopyWith<_$DeadlineUpdateImpl> get copyWith =>
      __$$DeadlineUpdateImplCopyWithImpl<_$DeadlineUpdateImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$DeadlineUpdateImplToJson(this);
  }
}

abstract class _DeadlineUpdate implements DeadlineUpdate {
  const factory _DeadlineUpdate({
    final String? title,
    final String? description,
    final DateTime? deadlineDate,
    final DeadlinePriority? priority,
    final DeadlineStatus? status,
  }) = _$DeadlineUpdateImpl;

  factory _DeadlineUpdate.fromJson(Map<String, dynamic> json) =
      _$DeadlineUpdateImpl.fromJson;

  @override
  String? get title;
  @override
  String? get description;
  @override
  DateTime? get deadlineDate;
  @override
  DeadlinePriority? get priority;
  @override
  DeadlineStatus? get status;

  /// Create a copy of DeadlineUpdate
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$DeadlineUpdateImplCopyWith<_$DeadlineUpdateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
