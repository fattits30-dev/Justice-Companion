// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'evidence_entity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

EvidenceEntity _$EvidenceEntityFromJson(Map<String, dynamic> json) {
  return _EvidenceEntity.fromJson(json);
}

/// @nodoc
mixin _$EvidenceEntity {
  int get id => throw _privateConstructorUsedError;
  int get caseId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get filePath => throw _privateConstructorUsedError;
  String? get content => throw _privateConstructorUsedError;
  EvidenceType get evidenceType => throw _privateConstructorUsedError;
  DateTime? get obtainedDate => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  DateTime get updatedAt => throw _privateConstructorUsedError;

  /// Serializes this EvidenceEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EvidenceEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EvidenceEntityCopyWith<EvidenceEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EvidenceEntityCopyWith<$Res> {
  factory $EvidenceEntityCopyWith(
    EvidenceEntity value,
    $Res Function(EvidenceEntity) then,
  ) = _$EvidenceEntityCopyWithImpl<$Res, EvidenceEntity>;
  @useResult
  $Res call({
    int id,
    int caseId,
    String title,
    String? filePath,
    String? content,
    EvidenceType evidenceType,
    DateTime? obtainedDate,
    DateTime createdAt,
    DateTime updatedAt,
  });
}

/// @nodoc
class _$EvidenceEntityCopyWithImpl<$Res, $Val extends EvidenceEntity>
    implements $EvidenceEntityCopyWith<$Res> {
  _$EvidenceEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EvidenceEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? caseId = null,
    Object? title = null,
    Object? filePath = freezed,
    Object? content = freezed,
    Object? evidenceType = null,
    Object? obtainedDate = freezed,
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
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            filePath: freezed == filePath
                ? _value.filePath
                : filePath // ignore: cast_nullable_to_non_nullable
                      as String?,
            content: freezed == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                      as String?,
            evidenceType: null == evidenceType
                ? _value.evidenceType
                : evidenceType // ignore: cast_nullable_to_non_nullable
                      as EvidenceType,
            obtainedDate: freezed == obtainedDate
                ? _value.obtainedDate
                : obtainedDate // ignore: cast_nullable_to_non_nullable
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
abstract class _$$EvidenceEntityImplCopyWith<$Res>
    implements $EvidenceEntityCopyWith<$Res> {
  factory _$$EvidenceEntityImplCopyWith(
    _$EvidenceEntityImpl value,
    $Res Function(_$EvidenceEntityImpl) then,
  ) = __$$EvidenceEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    int caseId,
    String title,
    String? filePath,
    String? content,
    EvidenceType evidenceType,
    DateTime? obtainedDate,
    DateTime createdAt,
    DateTime updatedAt,
  });
}

/// @nodoc
class __$$EvidenceEntityImplCopyWithImpl<$Res>
    extends _$EvidenceEntityCopyWithImpl<$Res, _$EvidenceEntityImpl>
    implements _$$EvidenceEntityImplCopyWith<$Res> {
  __$$EvidenceEntityImplCopyWithImpl(
    _$EvidenceEntityImpl _value,
    $Res Function(_$EvidenceEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of EvidenceEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? caseId = null,
    Object? title = null,
    Object? filePath = freezed,
    Object? content = freezed,
    Object? evidenceType = null,
    Object? obtainedDate = freezed,
    Object? createdAt = null,
    Object? updatedAt = null,
  }) {
    return _then(
      _$EvidenceEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        caseId: null == caseId
            ? _value.caseId
            : caseId // ignore: cast_nullable_to_non_nullable
                  as int,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        filePath: freezed == filePath
            ? _value.filePath
            : filePath // ignore: cast_nullable_to_non_nullable
                  as String?,
        content: freezed == content
            ? _value.content
            : content // ignore: cast_nullable_to_non_nullable
                  as String?,
        evidenceType: null == evidenceType
            ? _value.evidenceType
            : evidenceType // ignore: cast_nullable_to_non_nullable
                  as EvidenceType,
        obtainedDate: freezed == obtainedDate
            ? _value.obtainedDate
            : obtainedDate // ignore: cast_nullable_to_non_nullable
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
class _$EvidenceEntityImpl implements _EvidenceEntity {
  const _$EvidenceEntityImpl({
    required this.id,
    required this.caseId,
    required this.title,
    this.filePath,
    this.content,
    required this.evidenceType,
    this.obtainedDate,
    required this.createdAt,
    required this.updatedAt,
  });

  factory _$EvidenceEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$EvidenceEntityImplFromJson(json);

  @override
  final int id;
  @override
  final int caseId;
  @override
  final String title;
  @override
  final String? filePath;
  @override
  final String? content;
  @override
  final EvidenceType evidenceType;
  @override
  final DateTime? obtainedDate;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;

  @override
  String toString() {
    return 'EvidenceEntity(id: $id, caseId: $caseId, title: $title, filePath: $filePath, content: $content, evidenceType: $evidenceType, obtainedDate: $obtainedDate, createdAt: $createdAt, updatedAt: $updatedAt)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EvidenceEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.caseId, caseId) || other.caseId == caseId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.filePath, filePath) ||
                other.filePath == filePath) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.evidenceType, evidenceType) ||
                other.evidenceType == evidenceType) &&
            (identical(other.obtainedDate, obtainedDate) ||
                other.obtainedDate == obtainedDate) &&
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
    title,
    filePath,
    content,
    evidenceType,
    obtainedDate,
    createdAt,
    updatedAt,
  );

  /// Create a copy of EvidenceEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EvidenceEntityImplCopyWith<_$EvidenceEntityImpl> get copyWith =>
      __$$EvidenceEntityImplCopyWithImpl<_$EvidenceEntityImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$EvidenceEntityImplToJson(this);
  }
}

abstract class _EvidenceEntity implements EvidenceEntity {
  const factory _EvidenceEntity({
    required final int id,
    required final int caseId,
    required final String title,
    final String? filePath,
    final String? content,
    required final EvidenceType evidenceType,
    final DateTime? obtainedDate,
    required final DateTime createdAt,
    required final DateTime updatedAt,
  }) = _$EvidenceEntityImpl;

  factory _EvidenceEntity.fromJson(Map<String, dynamic> json) =
      _$EvidenceEntityImpl.fromJson;

  @override
  int get id;
  @override
  int get caseId;
  @override
  String get title;
  @override
  String? get filePath;
  @override
  String? get content;
  @override
  EvidenceType get evidenceType;
  @override
  DateTime? get obtainedDate;
  @override
  DateTime get createdAt;
  @override
  DateTime get updatedAt;

  /// Create a copy of EvidenceEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EvidenceEntityImplCopyWith<_$EvidenceEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EvidenceCreate _$EvidenceCreateFromJson(Map<String, dynamic> json) {
  return _EvidenceCreate.fromJson(json);
}

/// @nodoc
mixin _$EvidenceCreate {
  int get caseId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  String? get filePath => throw _privateConstructorUsedError;
  String? get content => throw _privateConstructorUsedError;
  EvidenceType get evidenceType => throw _privateConstructorUsedError;
  DateTime? get obtainedDate => throw _privateConstructorUsedError;

  /// Serializes this EvidenceCreate to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EvidenceCreate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EvidenceCreateCopyWith<EvidenceCreate> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EvidenceCreateCopyWith<$Res> {
  factory $EvidenceCreateCopyWith(
    EvidenceCreate value,
    $Res Function(EvidenceCreate) then,
  ) = _$EvidenceCreateCopyWithImpl<$Res, EvidenceCreate>;
  @useResult
  $Res call({
    int caseId,
    String title,
    String? filePath,
    String? content,
    EvidenceType evidenceType,
    DateTime? obtainedDate,
  });
}

/// @nodoc
class _$EvidenceCreateCopyWithImpl<$Res, $Val extends EvidenceCreate>
    implements $EvidenceCreateCopyWith<$Res> {
  _$EvidenceCreateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EvidenceCreate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? caseId = null,
    Object? title = null,
    Object? filePath = freezed,
    Object? content = freezed,
    Object? evidenceType = null,
    Object? obtainedDate = freezed,
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
            filePath: freezed == filePath
                ? _value.filePath
                : filePath // ignore: cast_nullable_to_non_nullable
                      as String?,
            content: freezed == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                      as String?,
            evidenceType: null == evidenceType
                ? _value.evidenceType
                : evidenceType // ignore: cast_nullable_to_non_nullable
                      as EvidenceType,
            obtainedDate: freezed == obtainedDate
                ? _value.obtainedDate
                : obtainedDate // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$EvidenceCreateImplCopyWith<$Res>
    implements $EvidenceCreateCopyWith<$Res> {
  factory _$$EvidenceCreateImplCopyWith(
    _$EvidenceCreateImpl value,
    $Res Function(_$EvidenceCreateImpl) then,
  ) = __$$EvidenceCreateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int caseId,
    String title,
    String? filePath,
    String? content,
    EvidenceType evidenceType,
    DateTime? obtainedDate,
  });
}

/// @nodoc
class __$$EvidenceCreateImplCopyWithImpl<$Res>
    extends _$EvidenceCreateCopyWithImpl<$Res, _$EvidenceCreateImpl>
    implements _$$EvidenceCreateImplCopyWith<$Res> {
  __$$EvidenceCreateImplCopyWithImpl(
    _$EvidenceCreateImpl _value,
    $Res Function(_$EvidenceCreateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of EvidenceCreate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? caseId = null,
    Object? title = null,
    Object? filePath = freezed,
    Object? content = freezed,
    Object? evidenceType = null,
    Object? obtainedDate = freezed,
  }) {
    return _then(
      _$EvidenceCreateImpl(
        caseId: null == caseId
            ? _value.caseId
            : caseId // ignore: cast_nullable_to_non_nullable
                  as int,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        filePath: freezed == filePath
            ? _value.filePath
            : filePath // ignore: cast_nullable_to_non_nullable
                  as String?,
        content: freezed == content
            ? _value.content
            : content // ignore: cast_nullable_to_non_nullable
                  as String?,
        evidenceType: null == evidenceType
            ? _value.evidenceType
            : evidenceType // ignore: cast_nullable_to_non_nullable
                  as EvidenceType,
        obtainedDate: freezed == obtainedDate
            ? _value.obtainedDate
            : obtainedDate // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$EvidenceCreateImpl implements _EvidenceCreate {
  const _$EvidenceCreateImpl({
    required this.caseId,
    required this.title,
    this.filePath,
    this.content,
    required this.evidenceType,
    this.obtainedDate,
  });

  factory _$EvidenceCreateImpl.fromJson(Map<String, dynamic> json) =>
      _$$EvidenceCreateImplFromJson(json);

  @override
  final int caseId;
  @override
  final String title;
  @override
  final String? filePath;
  @override
  final String? content;
  @override
  final EvidenceType evidenceType;
  @override
  final DateTime? obtainedDate;

  @override
  String toString() {
    return 'EvidenceCreate(caseId: $caseId, title: $title, filePath: $filePath, content: $content, evidenceType: $evidenceType, obtainedDate: $obtainedDate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EvidenceCreateImpl &&
            (identical(other.caseId, caseId) || other.caseId == caseId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.filePath, filePath) ||
                other.filePath == filePath) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.evidenceType, evidenceType) ||
                other.evidenceType == evidenceType) &&
            (identical(other.obtainedDate, obtainedDate) ||
                other.obtainedDate == obtainedDate));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    caseId,
    title,
    filePath,
    content,
    evidenceType,
    obtainedDate,
  );

  /// Create a copy of EvidenceCreate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EvidenceCreateImplCopyWith<_$EvidenceCreateImpl> get copyWith =>
      __$$EvidenceCreateImplCopyWithImpl<_$EvidenceCreateImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$EvidenceCreateImplToJson(this);
  }
}

abstract class _EvidenceCreate implements EvidenceCreate {
  const factory _EvidenceCreate({
    required final int caseId,
    required final String title,
    final String? filePath,
    final String? content,
    required final EvidenceType evidenceType,
    final DateTime? obtainedDate,
  }) = _$EvidenceCreateImpl;

  factory _EvidenceCreate.fromJson(Map<String, dynamic> json) =
      _$EvidenceCreateImpl.fromJson;

  @override
  int get caseId;
  @override
  String get title;
  @override
  String? get filePath;
  @override
  String? get content;
  @override
  EvidenceType get evidenceType;
  @override
  DateTime? get obtainedDate;

  /// Create a copy of EvidenceCreate
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EvidenceCreateImplCopyWith<_$EvidenceCreateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

EvidenceUpdate _$EvidenceUpdateFromJson(Map<String, dynamic> json) {
  return _EvidenceUpdate.fromJson(json);
}

/// @nodoc
mixin _$EvidenceUpdate {
  String? get title => throw _privateConstructorUsedError;
  String? get content => throw _privateConstructorUsedError;
  EvidenceType? get evidenceType => throw _privateConstructorUsedError;
  DateTime? get obtainedDate => throw _privateConstructorUsedError;

  /// Serializes this EvidenceUpdate to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of EvidenceUpdate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $EvidenceUpdateCopyWith<EvidenceUpdate> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $EvidenceUpdateCopyWith<$Res> {
  factory $EvidenceUpdateCopyWith(
    EvidenceUpdate value,
    $Res Function(EvidenceUpdate) then,
  ) = _$EvidenceUpdateCopyWithImpl<$Res, EvidenceUpdate>;
  @useResult
  $Res call({
    String? title,
    String? content,
    EvidenceType? evidenceType,
    DateTime? obtainedDate,
  });
}

/// @nodoc
class _$EvidenceUpdateCopyWithImpl<$Res, $Val extends EvidenceUpdate>
    implements $EvidenceUpdateCopyWith<$Res> {
  _$EvidenceUpdateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of EvidenceUpdate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = freezed,
    Object? content = freezed,
    Object? evidenceType = freezed,
    Object? obtainedDate = freezed,
  }) {
    return _then(
      _value.copyWith(
            title: freezed == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String?,
            content: freezed == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                      as String?,
            evidenceType: freezed == evidenceType
                ? _value.evidenceType
                : evidenceType // ignore: cast_nullable_to_non_nullable
                      as EvidenceType?,
            obtainedDate: freezed == obtainedDate
                ? _value.obtainedDate
                : obtainedDate // ignore: cast_nullable_to_non_nullable
                      as DateTime?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$EvidenceUpdateImplCopyWith<$Res>
    implements $EvidenceUpdateCopyWith<$Res> {
  factory _$$EvidenceUpdateImplCopyWith(
    _$EvidenceUpdateImpl value,
    $Res Function(_$EvidenceUpdateImpl) then,
  ) = __$$EvidenceUpdateImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    String? title,
    String? content,
    EvidenceType? evidenceType,
    DateTime? obtainedDate,
  });
}

/// @nodoc
class __$$EvidenceUpdateImplCopyWithImpl<$Res>
    extends _$EvidenceUpdateCopyWithImpl<$Res, _$EvidenceUpdateImpl>
    implements _$$EvidenceUpdateImplCopyWith<$Res> {
  __$$EvidenceUpdateImplCopyWithImpl(
    _$EvidenceUpdateImpl _value,
    $Res Function(_$EvidenceUpdateImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of EvidenceUpdate
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? title = freezed,
    Object? content = freezed,
    Object? evidenceType = freezed,
    Object? obtainedDate = freezed,
  }) {
    return _then(
      _$EvidenceUpdateImpl(
        title: freezed == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String?,
        content: freezed == content
            ? _value.content
            : content // ignore: cast_nullable_to_non_nullable
                  as String?,
        evidenceType: freezed == evidenceType
            ? _value.evidenceType
            : evidenceType // ignore: cast_nullable_to_non_nullable
                  as EvidenceType?,
        obtainedDate: freezed == obtainedDate
            ? _value.obtainedDate
            : obtainedDate // ignore: cast_nullable_to_non_nullable
                  as DateTime?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$EvidenceUpdateImpl implements _EvidenceUpdate {
  const _$EvidenceUpdateImpl({
    this.title,
    this.content,
    this.evidenceType,
    this.obtainedDate,
  });

  factory _$EvidenceUpdateImpl.fromJson(Map<String, dynamic> json) =>
      _$$EvidenceUpdateImplFromJson(json);

  @override
  final String? title;
  @override
  final String? content;
  @override
  final EvidenceType? evidenceType;
  @override
  final DateTime? obtainedDate;

  @override
  String toString() {
    return 'EvidenceUpdate(title: $title, content: $content, evidenceType: $evidenceType, obtainedDate: $obtainedDate)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$EvidenceUpdateImpl &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.evidenceType, evidenceType) ||
                other.evidenceType == evidenceType) &&
            (identical(other.obtainedDate, obtainedDate) ||
                other.obtainedDate == obtainedDate));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode =>
      Object.hash(runtimeType, title, content, evidenceType, obtainedDate);

  /// Create a copy of EvidenceUpdate
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$EvidenceUpdateImplCopyWith<_$EvidenceUpdateImpl> get copyWith =>
      __$$EvidenceUpdateImplCopyWithImpl<_$EvidenceUpdateImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$EvidenceUpdateImplToJson(this);
  }
}

abstract class _EvidenceUpdate implements EvidenceUpdate {
  const factory _EvidenceUpdate({
    final String? title,
    final String? content,
    final EvidenceType? evidenceType,
    final DateTime? obtainedDate,
  }) = _$EvidenceUpdateImpl;

  factory _EvidenceUpdate.fromJson(Map<String, dynamic> json) =
      _$EvidenceUpdateImpl.fromJson;

  @override
  String? get title;
  @override
  String? get content;
  @override
  EvidenceType? get evidenceType;
  @override
  DateTime? get obtainedDate;

  /// Create a copy of EvidenceUpdate
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$EvidenceUpdateImplCopyWith<_$EvidenceUpdateImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
