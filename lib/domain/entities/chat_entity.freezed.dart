// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chat_entity.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

ConversationEntity _$ConversationEntityFromJson(Map<String, dynamic> json) {
  return _ConversationEntity.fromJson(json);
}

/// @nodoc
mixin _$ConversationEntity {
  int get id => throw _privateConstructorUsedError;
  int get userId => throw _privateConstructorUsedError;
  int? get caseId => throw _privateConstructorUsedError;
  String get title => throw _privateConstructorUsedError;
  DateTime get createdAt => throw _privateConstructorUsedError;
  DateTime get updatedAt => throw _privateConstructorUsedError;
  int get messageCount => throw _privateConstructorUsedError;

  /// Serializes this ConversationEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ConversationEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ConversationEntityCopyWith<ConversationEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ConversationEntityCopyWith<$Res> {
  factory $ConversationEntityCopyWith(
    ConversationEntity value,
    $Res Function(ConversationEntity) then,
  ) = _$ConversationEntityCopyWithImpl<$Res, ConversationEntity>;
  @useResult
  $Res call({
    int id,
    int userId,
    int? caseId,
    String title,
    DateTime createdAt,
    DateTime updatedAt,
    int messageCount,
  });
}

/// @nodoc
class _$ConversationEntityCopyWithImpl<$Res, $Val extends ConversationEntity>
    implements $ConversationEntityCopyWith<$Res> {
  _$ConversationEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ConversationEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? caseId = freezed,
    Object? title = null,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? messageCount = null,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            userId: null == userId
                ? _value.userId
                : userId // ignore: cast_nullable_to_non_nullable
                      as int,
            caseId: freezed == caseId
                ? _value.caseId
                : caseId // ignore: cast_nullable_to_non_nullable
                      as int?,
            title: null == title
                ? _value.title
                : title // ignore: cast_nullable_to_non_nullable
                      as String,
            createdAt: null == createdAt
                ? _value.createdAt
                : createdAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            updatedAt: null == updatedAt
                ? _value.updatedAt
                : updatedAt // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            messageCount: null == messageCount
                ? _value.messageCount
                : messageCount // ignore: cast_nullable_to_non_nullable
                      as int,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$ConversationEntityImplCopyWith<$Res>
    implements $ConversationEntityCopyWith<$Res> {
  factory _$$ConversationEntityImplCopyWith(
    _$ConversationEntityImpl value,
    $Res Function(_$ConversationEntityImpl) then,
  ) = __$$ConversationEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    int userId,
    int? caseId,
    String title,
    DateTime createdAt,
    DateTime updatedAt,
    int messageCount,
  });
}

/// @nodoc
class __$$ConversationEntityImplCopyWithImpl<$Res>
    extends _$ConversationEntityCopyWithImpl<$Res, _$ConversationEntityImpl>
    implements _$$ConversationEntityImplCopyWith<$Res> {
  __$$ConversationEntityImplCopyWithImpl(
    _$ConversationEntityImpl _value,
    $Res Function(_$ConversationEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? userId = null,
    Object? caseId = freezed,
    Object? title = null,
    Object? createdAt = null,
    Object? updatedAt = null,
    Object? messageCount = null,
  }) {
    return _then(
      _$ConversationEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        userId: null == userId
            ? _value.userId
            : userId // ignore: cast_nullable_to_non_nullable
                  as int,
        caseId: freezed == caseId
            ? _value.caseId
            : caseId // ignore: cast_nullable_to_non_nullable
                  as int?,
        title: null == title
            ? _value.title
            : title // ignore: cast_nullable_to_non_nullable
                  as String,
        createdAt: null == createdAt
            ? _value.createdAt
            : createdAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        updatedAt: null == updatedAt
            ? _value.updatedAt
            : updatedAt // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        messageCount: null == messageCount
            ? _value.messageCount
            : messageCount // ignore: cast_nullable_to_non_nullable
                  as int,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ConversationEntityImpl implements _ConversationEntity {
  const _$ConversationEntityImpl({
    required this.id,
    required this.userId,
    this.caseId,
    required this.title,
    required this.createdAt,
    required this.updatedAt,
    this.messageCount = 0,
  });

  factory _$ConversationEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$ConversationEntityImplFromJson(json);

  @override
  final int id;
  @override
  final int userId;
  @override
  final int? caseId;
  @override
  final String title;
  @override
  final DateTime createdAt;
  @override
  final DateTime updatedAt;
  @override
  @JsonKey()
  final int messageCount;

  @override
  String toString() {
    return 'ConversationEntity(id: $id, userId: $userId, caseId: $caseId, title: $title, createdAt: $createdAt, updatedAt: $updatedAt, messageCount: $messageCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.userId, userId) || other.userId == userId) &&
            (identical(other.caseId, caseId) || other.caseId == caseId) &&
            (identical(other.title, title) || other.title == title) &&
            (identical(other.createdAt, createdAt) ||
                other.createdAt == createdAt) &&
            (identical(other.updatedAt, updatedAt) ||
                other.updatedAt == updatedAt) &&
            (identical(other.messageCount, messageCount) ||
                other.messageCount == messageCount));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    userId,
    caseId,
    title,
    createdAt,
    updatedAt,
    messageCount,
  );

  /// Create a copy of ConversationEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ConversationEntityImplCopyWith<_$ConversationEntityImpl> get copyWith =>
      __$$ConversationEntityImplCopyWithImpl<_$ConversationEntityImpl>(
        this,
        _$identity,
      );

  @override
  Map<String, dynamic> toJson() {
    return _$$ConversationEntityImplToJson(this);
  }
}

abstract class _ConversationEntity implements ConversationEntity {
  const factory _ConversationEntity({
    required final int id,
    required final int userId,
    final int? caseId,
    required final String title,
    required final DateTime createdAt,
    required final DateTime updatedAt,
    final int messageCount,
  }) = _$ConversationEntityImpl;

  factory _ConversationEntity.fromJson(Map<String, dynamic> json) =
      _$ConversationEntityImpl.fromJson;

  @override
  int get id;
  @override
  int get userId;
  @override
  int? get caseId;
  @override
  String get title;
  @override
  DateTime get createdAt;
  @override
  DateTime get updatedAt;
  @override
  int get messageCount;

  /// Create a copy of ConversationEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ConversationEntityImplCopyWith<_$ConversationEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

MessageEntity _$MessageEntityFromJson(Map<String, dynamic> json) {
  return _MessageEntity.fromJson(json);
}

/// @nodoc
mixin _$MessageEntity {
  int get id => throw _privateConstructorUsedError;
  int get conversationId => throw _privateConstructorUsedError;
  MessageRole get role => throw _privateConstructorUsedError;
  String get content => throw _privateConstructorUsedError;
  DateTime get timestamp => throw _privateConstructorUsedError;
  int? get tokenCount => throw _privateConstructorUsedError;

  /// Serializes this MessageEntity to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of MessageEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $MessageEntityCopyWith<MessageEntity> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $MessageEntityCopyWith<$Res> {
  factory $MessageEntityCopyWith(
    MessageEntity value,
    $Res Function(MessageEntity) then,
  ) = _$MessageEntityCopyWithImpl<$Res, MessageEntity>;
  @useResult
  $Res call({
    int id,
    int conversationId,
    MessageRole role,
    String content,
    DateTime timestamp,
    int? tokenCount,
  });
}

/// @nodoc
class _$MessageEntityCopyWithImpl<$Res, $Val extends MessageEntity>
    implements $MessageEntityCopyWith<$Res> {
  _$MessageEntityCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of MessageEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? conversationId = null,
    Object? role = null,
    Object? content = null,
    Object? timestamp = null,
    Object? tokenCount = freezed,
  }) {
    return _then(
      _value.copyWith(
            id: null == id
                ? _value.id
                : id // ignore: cast_nullable_to_non_nullable
                      as int,
            conversationId: null == conversationId
                ? _value.conversationId
                : conversationId // ignore: cast_nullable_to_non_nullable
                      as int,
            role: null == role
                ? _value.role
                : role // ignore: cast_nullable_to_non_nullable
                      as MessageRole,
            content: null == content
                ? _value.content
                : content // ignore: cast_nullable_to_non_nullable
                      as String,
            timestamp: null == timestamp
                ? _value.timestamp
                : timestamp // ignore: cast_nullable_to_non_nullable
                      as DateTime,
            tokenCount: freezed == tokenCount
                ? _value.tokenCount
                : tokenCount // ignore: cast_nullable_to_non_nullable
                      as int?,
          )
          as $Val,
    );
  }
}

/// @nodoc
abstract class _$$MessageEntityImplCopyWith<$Res>
    implements $MessageEntityCopyWith<$Res> {
  factory _$$MessageEntityImplCopyWith(
    _$MessageEntityImpl value,
    $Res Function(_$MessageEntityImpl) then,
  ) = __$$MessageEntityImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({
    int id,
    int conversationId,
    MessageRole role,
    String content,
    DateTime timestamp,
    int? tokenCount,
  });
}

/// @nodoc
class __$$MessageEntityImplCopyWithImpl<$Res>
    extends _$MessageEntityCopyWithImpl<$Res, _$MessageEntityImpl>
    implements _$$MessageEntityImplCopyWith<$Res> {
  __$$MessageEntityImplCopyWithImpl(
    _$MessageEntityImpl _value,
    $Res Function(_$MessageEntityImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of MessageEntity
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? id = null,
    Object? conversationId = null,
    Object? role = null,
    Object? content = null,
    Object? timestamp = null,
    Object? tokenCount = freezed,
  }) {
    return _then(
      _$MessageEntityImpl(
        id: null == id
            ? _value.id
            : id // ignore: cast_nullable_to_non_nullable
                  as int,
        conversationId: null == conversationId
            ? _value.conversationId
            : conversationId // ignore: cast_nullable_to_non_nullable
                  as int,
        role: null == role
            ? _value.role
            : role // ignore: cast_nullable_to_non_nullable
                  as MessageRole,
        content: null == content
            ? _value.content
            : content // ignore: cast_nullable_to_non_nullable
                  as String,
        timestamp: null == timestamp
            ? _value.timestamp
            : timestamp // ignore: cast_nullable_to_non_nullable
                  as DateTime,
        tokenCount: freezed == tokenCount
            ? _value.tokenCount
            : tokenCount // ignore: cast_nullable_to_non_nullable
                  as int?,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$MessageEntityImpl implements _MessageEntity {
  const _$MessageEntityImpl({
    required this.id,
    required this.conversationId,
    required this.role,
    required this.content,
    required this.timestamp,
    this.tokenCount,
  });

  factory _$MessageEntityImpl.fromJson(Map<String, dynamic> json) =>
      _$$MessageEntityImplFromJson(json);

  @override
  final int id;
  @override
  final int conversationId;
  @override
  final MessageRole role;
  @override
  final String content;
  @override
  final DateTime timestamp;
  @override
  final int? tokenCount;

  @override
  String toString() {
    return 'MessageEntity(id: $id, conversationId: $conversationId, role: $role, content: $content, timestamp: $timestamp, tokenCount: $tokenCount)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$MessageEntityImpl &&
            (identical(other.id, id) || other.id == id) &&
            (identical(other.conversationId, conversationId) ||
                other.conversationId == conversationId) &&
            (identical(other.role, role) || other.role == role) &&
            (identical(other.content, content) || other.content == content) &&
            (identical(other.timestamp, timestamp) ||
                other.timestamp == timestamp) &&
            (identical(other.tokenCount, tokenCount) ||
                other.tokenCount == tokenCount));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    id,
    conversationId,
    role,
    content,
    timestamp,
    tokenCount,
  );

  /// Create a copy of MessageEntity
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$MessageEntityImplCopyWith<_$MessageEntityImpl> get copyWith =>
      __$$MessageEntityImplCopyWithImpl<_$MessageEntityImpl>(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$MessageEntityImplToJson(this);
  }
}

abstract class _MessageEntity implements MessageEntity {
  const factory _MessageEntity({
    required final int id,
    required final int conversationId,
    required final MessageRole role,
    required final String content,
    required final DateTime timestamp,
    final int? tokenCount,
  }) = _$MessageEntityImpl;

  factory _MessageEntity.fromJson(Map<String, dynamic> json) =
      _$MessageEntityImpl.fromJson;

  @override
  int get id;
  @override
  int get conversationId;
  @override
  MessageRole get role;
  @override
  String get content;
  @override
  DateTime get timestamp;
  @override
  int? get tokenCount;

  /// Create a copy of MessageEntity
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$MessageEntityImplCopyWith<_$MessageEntityImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

ConversationWithMessages _$ConversationWithMessagesFromJson(
  Map<String, dynamic> json,
) {
  return _ConversationWithMessages.fromJson(json);
}

/// @nodoc
mixin _$ConversationWithMessages {
  ConversationEntity get conversation => throw _privateConstructorUsedError;
  List<MessageEntity> get messages => throw _privateConstructorUsedError;

  /// Serializes this ConversationWithMessages to a JSON map.
  Map<String, dynamic> toJson() => throw _privateConstructorUsedError;

  /// Create a copy of ConversationWithMessages
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  $ConversationWithMessagesCopyWith<ConversationWithMessages> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ConversationWithMessagesCopyWith<$Res> {
  factory $ConversationWithMessagesCopyWith(
    ConversationWithMessages value,
    $Res Function(ConversationWithMessages) then,
  ) = _$ConversationWithMessagesCopyWithImpl<$Res, ConversationWithMessages>;
  @useResult
  $Res call({ConversationEntity conversation, List<MessageEntity> messages});

  $ConversationEntityCopyWith<$Res> get conversation;
}

/// @nodoc
class _$ConversationWithMessagesCopyWithImpl<
  $Res,
  $Val extends ConversationWithMessages
>
    implements $ConversationWithMessagesCopyWith<$Res> {
  _$ConversationWithMessagesCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ConversationWithMessages
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? conversation = null, Object? messages = null}) {
    return _then(
      _value.copyWith(
            conversation: null == conversation
                ? _value.conversation
                : conversation // ignore: cast_nullable_to_non_nullable
                      as ConversationEntity,
            messages: null == messages
                ? _value.messages
                : messages // ignore: cast_nullable_to_non_nullable
                      as List<MessageEntity>,
          )
          as $Val,
    );
  }

  /// Create a copy of ConversationWithMessages
  /// with the given fields replaced by the non-null parameter values.
  @override
  @pragma('vm:prefer-inline')
  $ConversationEntityCopyWith<$Res> get conversation {
    return $ConversationEntityCopyWith<$Res>(_value.conversation, (value) {
      return _then(_value.copyWith(conversation: value) as $Val);
    });
  }
}

/// @nodoc
abstract class _$$ConversationWithMessagesImplCopyWith<$Res>
    implements $ConversationWithMessagesCopyWith<$Res> {
  factory _$$ConversationWithMessagesImplCopyWith(
    _$ConversationWithMessagesImpl value,
    $Res Function(_$ConversationWithMessagesImpl) then,
  ) = __$$ConversationWithMessagesImplCopyWithImpl<$Res>;
  @override
  @useResult
  $Res call({ConversationEntity conversation, List<MessageEntity> messages});

  @override
  $ConversationEntityCopyWith<$Res> get conversation;
}

/// @nodoc
class __$$ConversationWithMessagesImplCopyWithImpl<$Res>
    extends
        _$ConversationWithMessagesCopyWithImpl<
          $Res,
          _$ConversationWithMessagesImpl
        >
    implements _$$ConversationWithMessagesImplCopyWith<$Res> {
  __$$ConversationWithMessagesImplCopyWithImpl(
    _$ConversationWithMessagesImpl _value,
    $Res Function(_$ConversationWithMessagesImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationWithMessages
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? conversation = null, Object? messages = null}) {
    return _then(
      _$ConversationWithMessagesImpl(
        conversation: null == conversation
            ? _value.conversation
            : conversation // ignore: cast_nullable_to_non_nullable
                  as ConversationEntity,
        messages: null == messages
            ? _value._messages
            : messages // ignore: cast_nullable_to_non_nullable
                  as List<MessageEntity>,
      ),
    );
  }
}

/// @nodoc
@JsonSerializable()
class _$ConversationWithMessagesImpl implements _ConversationWithMessages {
  const _$ConversationWithMessagesImpl({
    required this.conversation,
    required final List<MessageEntity> messages,
  }) : _messages = messages;

  factory _$ConversationWithMessagesImpl.fromJson(Map<String, dynamic> json) =>
      _$$ConversationWithMessagesImplFromJson(json);

  @override
  final ConversationEntity conversation;
  final List<MessageEntity> _messages;
  @override
  List<MessageEntity> get messages {
    if (_messages is EqualUnmodifiableListView) return _messages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_messages);
  }

  @override
  String toString() {
    return 'ConversationWithMessages(conversation: $conversation, messages: $messages)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationWithMessagesImpl &&
            (identical(other.conversation, conversation) ||
                other.conversation == conversation) &&
            const DeepCollectionEquality().equals(other._messages, _messages));
  }

  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  int get hashCode => Object.hash(
    runtimeType,
    conversation,
    const DeepCollectionEquality().hash(_messages),
  );

  /// Create a copy of ConversationWithMessages
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ConversationWithMessagesImplCopyWith<_$ConversationWithMessagesImpl>
  get copyWith =>
      __$$ConversationWithMessagesImplCopyWithImpl<
        _$ConversationWithMessagesImpl
      >(this, _$identity);

  @override
  Map<String, dynamic> toJson() {
    return _$$ConversationWithMessagesImplToJson(this);
  }
}

abstract class _ConversationWithMessages implements ConversationWithMessages {
  const factory _ConversationWithMessages({
    required final ConversationEntity conversation,
    required final List<MessageEntity> messages,
  }) = _$ConversationWithMessagesImpl;

  factory _ConversationWithMessages.fromJson(Map<String, dynamic> json) =
      _$ConversationWithMessagesImpl.fromJson;

  @override
  ConversationEntity get conversation;
  @override
  List<MessageEntity> get messages;

  /// Create a copy of ConversationWithMessages
  /// with the given fields replaced by the non-null parameter values.
  @override
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ConversationWithMessagesImplCopyWith<_$ConversationWithMessagesImpl>
  get copyWith => throw _privateConstructorUsedError;
}
