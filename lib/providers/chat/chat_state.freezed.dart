// coverage:ignore-file
// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'chat_state.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

T _$identity<T>(T value) => value;

final _privateConstructorUsedError = UnsupportedError(
  'It seems like you constructed your class using `MyClass._()`. This constructor is only meant to be used by freezed and you are not supposed to need it nor use it.\nPlease check the documentation here for more information: https://github.com/rrousselGit/freezed#adding-getters-and-methods-to-our-models',
);

/// @nodoc
mixin _$ChatState {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )
    loaded,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )
    streaming,
    required TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )
    error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult? Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
    required TResult orElse(),
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ChatInitial value) initial,
    required TResult Function(ChatLoading value) loading,
    required TResult Function(ChatLoaded value) loaded,
    required TResult Function(ChatStreaming value) streaming,
    required TResult Function(ChatError value) error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ChatInitial value)? initial,
    TResult? Function(ChatLoading value)? loading,
    TResult? Function(ChatLoaded value)? loaded,
    TResult? Function(ChatStreaming value)? streaming,
    TResult? Function(ChatError value)? error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ChatInitial value)? initial,
    TResult Function(ChatLoading value)? loading,
    TResult Function(ChatLoaded value)? loaded,
    TResult Function(ChatStreaming value)? streaming,
    TResult Function(ChatError value)? error,
    required TResult orElse(),
  }) => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ChatStateCopyWith<$Res> {
  factory $ChatStateCopyWith(ChatState value, $Res Function(ChatState) then) =
      _$ChatStateCopyWithImpl<$Res, ChatState>;
}

/// @nodoc
class _$ChatStateCopyWithImpl<$Res, $Val extends ChatState>
    implements $ChatStateCopyWith<$Res> {
  _$ChatStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$ChatInitialImplCopyWith<$Res> {
  factory _$$ChatInitialImplCopyWith(
    _$ChatInitialImpl value,
    $Res Function(_$ChatInitialImpl) then,
  ) = __$$ChatInitialImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ChatInitialImplCopyWithImpl<$Res>
    extends _$ChatStateCopyWithImpl<$Res, _$ChatInitialImpl>
    implements _$$ChatInitialImplCopyWith<$Res> {
  __$$ChatInitialImplCopyWithImpl(
    _$ChatInitialImpl _value,
    $Res Function(_$ChatInitialImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$ChatInitialImpl implements ChatInitial {
  const _$ChatInitialImpl();

  @override
  String toString() {
    return 'ChatState.initial()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$ChatInitialImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )
    loaded,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )
    streaming,
    required TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )
    error,
  }) {
    return initial();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult? Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
  }) {
    return initial?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
    required TResult orElse(),
  }) {
    if (initial != null) {
      return initial();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ChatInitial value) initial,
    required TResult Function(ChatLoading value) loading,
    required TResult Function(ChatLoaded value) loaded,
    required TResult Function(ChatStreaming value) streaming,
    required TResult Function(ChatError value) error,
  }) {
    return initial(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ChatInitial value)? initial,
    TResult? Function(ChatLoading value)? loading,
    TResult? Function(ChatLoaded value)? loaded,
    TResult? Function(ChatStreaming value)? streaming,
    TResult? Function(ChatError value)? error,
  }) {
    return initial?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ChatInitial value)? initial,
    TResult Function(ChatLoading value)? loading,
    TResult Function(ChatLoaded value)? loaded,
    TResult Function(ChatStreaming value)? streaming,
    TResult Function(ChatError value)? error,
    required TResult orElse(),
  }) {
    if (initial != null) {
      return initial(this);
    }
    return orElse();
  }
}

abstract class ChatInitial implements ChatState {
  const factory ChatInitial() = _$ChatInitialImpl;
}

/// @nodoc
abstract class _$$ChatLoadingImplCopyWith<$Res> {
  factory _$$ChatLoadingImplCopyWith(
    _$ChatLoadingImpl value,
    $Res Function(_$ChatLoadingImpl) then,
  ) = __$$ChatLoadingImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ChatLoadingImplCopyWithImpl<$Res>
    extends _$ChatStateCopyWithImpl<$Res, _$ChatLoadingImpl>
    implements _$$ChatLoadingImplCopyWith<$Res> {
  __$$ChatLoadingImplCopyWithImpl(
    _$ChatLoadingImpl _value,
    $Res Function(_$ChatLoadingImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$ChatLoadingImpl implements ChatLoading {
  const _$ChatLoadingImpl();

  @override
  String toString() {
    return 'ChatState.loading()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType && other is _$ChatLoadingImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )
    loaded,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )
    streaming,
    required TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )
    error,
  }) {
    return loading();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult? Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
  }) {
    return loading?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
    required TResult orElse(),
  }) {
    if (loading != null) {
      return loading();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ChatInitial value) initial,
    required TResult Function(ChatLoading value) loading,
    required TResult Function(ChatLoaded value) loaded,
    required TResult Function(ChatStreaming value) streaming,
    required TResult Function(ChatError value) error,
  }) {
    return loading(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ChatInitial value)? initial,
    TResult? Function(ChatLoading value)? loading,
    TResult? Function(ChatLoaded value)? loaded,
    TResult? Function(ChatStreaming value)? streaming,
    TResult? Function(ChatError value)? error,
  }) {
    return loading?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ChatInitial value)? initial,
    TResult Function(ChatLoading value)? loading,
    TResult Function(ChatLoaded value)? loaded,
    TResult Function(ChatStreaming value)? streaming,
    TResult Function(ChatError value)? error,
    required TResult orElse(),
  }) {
    if (loading != null) {
      return loading(this);
    }
    return orElse();
  }
}

abstract class ChatLoading implements ChatState {
  const factory ChatLoading() = _$ChatLoadingImpl;
}

/// @nodoc
abstract class _$$ChatLoadedImplCopyWith<$Res> {
  factory _$$ChatLoadedImplCopyWith(
    _$ChatLoadedImpl value,
    $Res Function(_$ChatLoadedImpl) then,
  ) = __$$ChatLoadedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({
    List<MessageEntity> messages,
    int? conversationId,
    bool isStreaming,
  });
}

/// @nodoc
class __$$ChatLoadedImplCopyWithImpl<$Res>
    extends _$ChatStateCopyWithImpl<$Res, _$ChatLoadedImpl>
    implements _$$ChatLoadedImplCopyWith<$Res> {
  __$$ChatLoadedImplCopyWithImpl(
    _$ChatLoadedImpl _value,
    $Res Function(_$ChatLoadedImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? messages = null,
    Object? conversationId = freezed,
    Object? isStreaming = null,
  }) {
    return _then(
      _$ChatLoadedImpl(
        messages: null == messages
            ? _value._messages
            : messages // ignore: cast_nullable_to_non_nullable
                  as List<MessageEntity>,
        conversationId: freezed == conversationId
            ? _value.conversationId
            : conversationId // ignore: cast_nullable_to_non_nullable
                  as int?,
        isStreaming: null == isStreaming
            ? _value.isStreaming
            : isStreaming // ignore: cast_nullable_to_non_nullable
                  as bool,
      ),
    );
  }
}

/// @nodoc

class _$ChatLoadedImpl implements ChatLoaded {
  const _$ChatLoadedImpl({
    required final List<MessageEntity> messages,
    this.conversationId,
    this.isStreaming = false,
  }) : _messages = messages;

  final List<MessageEntity> _messages;
  @override
  List<MessageEntity> get messages {
    if (_messages is EqualUnmodifiableListView) return _messages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_messages);
  }

  @override
  final int? conversationId;
  @override
  @JsonKey()
  final bool isStreaming;

  @override
  String toString() {
    return 'ChatState.loaded(messages: $messages, conversationId: $conversationId, isStreaming: $isStreaming)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ChatLoadedImpl &&
            const DeepCollectionEquality().equals(other._messages, _messages) &&
            (identical(other.conversationId, conversationId) ||
                other.conversationId == conversationId) &&
            (identical(other.isStreaming, isStreaming) ||
                other.isStreaming == isStreaming));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(_messages),
    conversationId,
    isStreaming,
  );

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ChatLoadedImplCopyWith<_$ChatLoadedImpl> get copyWith =>
      __$$ChatLoadedImplCopyWithImpl<_$ChatLoadedImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )
    loaded,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )
    streaming,
    required TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )
    error,
  }) {
    return loaded(messages, conversationId, isStreaming);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult? Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
  }) {
    return loaded?.call(messages, conversationId, isStreaming);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
    required TResult orElse(),
  }) {
    if (loaded != null) {
      return loaded(messages, conversationId, isStreaming);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ChatInitial value) initial,
    required TResult Function(ChatLoading value) loading,
    required TResult Function(ChatLoaded value) loaded,
    required TResult Function(ChatStreaming value) streaming,
    required TResult Function(ChatError value) error,
  }) {
    return loaded(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ChatInitial value)? initial,
    TResult? Function(ChatLoading value)? loading,
    TResult? Function(ChatLoaded value)? loaded,
    TResult? Function(ChatStreaming value)? streaming,
    TResult? Function(ChatError value)? error,
  }) {
    return loaded?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ChatInitial value)? initial,
    TResult Function(ChatLoading value)? loading,
    TResult Function(ChatLoaded value)? loaded,
    TResult Function(ChatStreaming value)? streaming,
    TResult Function(ChatError value)? error,
    required TResult orElse(),
  }) {
    if (loaded != null) {
      return loaded(this);
    }
    return orElse();
  }
}

abstract class ChatLoaded implements ChatState {
  const factory ChatLoaded({
    required final List<MessageEntity> messages,
    final int? conversationId,
    final bool isStreaming,
  }) = _$ChatLoadedImpl;

  List<MessageEntity> get messages;
  int? get conversationId;
  bool get isStreaming;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ChatLoadedImplCopyWith<_$ChatLoadedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ChatStreamingImplCopyWith<$Res> {
  factory _$$ChatStreamingImplCopyWith(
    _$ChatStreamingImpl value,
    $Res Function(_$ChatStreamingImpl) then,
  ) = __$$ChatStreamingImplCopyWithImpl<$Res>;
  @useResult
  $Res call({
    List<MessageEntity> messages,
    int? conversationId,
    String partialResponse,
  });
}

/// @nodoc
class __$$ChatStreamingImplCopyWithImpl<$Res>
    extends _$ChatStateCopyWithImpl<$Res, _$ChatStreamingImpl>
    implements _$$ChatStreamingImplCopyWith<$Res> {
  __$$ChatStreamingImplCopyWithImpl(
    _$ChatStreamingImpl _value,
    $Res Function(_$ChatStreamingImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? messages = null,
    Object? conversationId = freezed,
    Object? partialResponse = null,
  }) {
    return _then(
      _$ChatStreamingImpl(
        messages: null == messages
            ? _value._messages
            : messages // ignore: cast_nullable_to_non_nullable
                  as List<MessageEntity>,
        conversationId: freezed == conversationId
            ? _value.conversationId
            : conversationId // ignore: cast_nullable_to_non_nullable
                  as int?,
        partialResponse: null == partialResponse
            ? _value.partialResponse
            : partialResponse // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc

class _$ChatStreamingImpl implements ChatStreaming {
  const _$ChatStreamingImpl({
    required final List<MessageEntity> messages,
    this.conversationId,
    this.partialResponse = '',
  }) : _messages = messages;

  final List<MessageEntity> _messages;
  @override
  List<MessageEntity> get messages {
    if (_messages is EqualUnmodifiableListView) return _messages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_messages);
  }

  @override
  final int? conversationId;
  @override
  @JsonKey()
  final String partialResponse;

  @override
  String toString() {
    return 'ChatState.streaming(messages: $messages, conversationId: $conversationId, partialResponse: $partialResponse)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ChatStreamingImpl &&
            const DeepCollectionEquality().equals(other._messages, _messages) &&
            (identical(other.conversationId, conversationId) ||
                other.conversationId == conversationId) &&
            (identical(other.partialResponse, partialResponse) ||
                other.partialResponse == partialResponse));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(_messages),
    conversationId,
    partialResponse,
  );

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ChatStreamingImplCopyWith<_$ChatStreamingImpl> get copyWith =>
      __$$ChatStreamingImplCopyWithImpl<_$ChatStreamingImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )
    loaded,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )
    streaming,
    required TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )
    error,
  }) {
    return streaming(messages, conversationId, partialResponse);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult? Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
  }) {
    return streaming?.call(messages, conversationId, partialResponse);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
    required TResult orElse(),
  }) {
    if (streaming != null) {
      return streaming(messages, conversationId, partialResponse);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ChatInitial value) initial,
    required TResult Function(ChatLoading value) loading,
    required TResult Function(ChatLoaded value) loaded,
    required TResult Function(ChatStreaming value) streaming,
    required TResult Function(ChatError value) error,
  }) {
    return streaming(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ChatInitial value)? initial,
    TResult? Function(ChatLoading value)? loading,
    TResult? Function(ChatLoaded value)? loaded,
    TResult? Function(ChatStreaming value)? streaming,
    TResult? Function(ChatError value)? error,
  }) {
    return streaming?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ChatInitial value)? initial,
    TResult Function(ChatLoading value)? loading,
    TResult Function(ChatLoaded value)? loaded,
    TResult Function(ChatStreaming value)? streaming,
    TResult Function(ChatError value)? error,
    required TResult orElse(),
  }) {
    if (streaming != null) {
      return streaming(this);
    }
    return orElse();
  }
}

abstract class ChatStreaming implements ChatState {
  const factory ChatStreaming({
    required final List<MessageEntity> messages,
    final int? conversationId,
    final String partialResponse,
  }) = _$ChatStreamingImpl;

  List<MessageEntity> get messages;
  int? get conversationId;
  String get partialResponse;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ChatStreamingImplCopyWith<_$ChatStreamingImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ChatErrorImplCopyWith<$Res> {
  factory _$$ChatErrorImplCopyWith(
    _$ChatErrorImpl value,
    $Res Function(_$ChatErrorImpl) then,
  ) = __$$ChatErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({
    String message,
    List<MessageEntity>? messages,
    int? conversationId,
  });
}

/// @nodoc
class __$$ChatErrorImplCopyWithImpl<$Res>
    extends _$ChatStateCopyWithImpl<$Res, _$ChatErrorImpl>
    implements _$$ChatErrorImplCopyWith<$Res> {
  __$$ChatErrorImplCopyWithImpl(
    _$ChatErrorImpl _value,
    $Res Function(_$ChatErrorImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({
    Object? message = null,
    Object? messages = freezed,
    Object? conversationId = freezed,
  }) {
    return _then(
      _$ChatErrorImpl(
        message: null == message
            ? _value.message
            : message // ignore: cast_nullable_to_non_nullable
                  as String,
        messages: freezed == messages
            ? _value._messages
            : messages // ignore: cast_nullable_to_non_nullable
                  as List<MessageEntity>?,
        conversationId: freezed == conversationId
            ? _value.conversationId
            : conversationId // ignore: cast_nullable_to_non_nullable
                  as int?,
      ),
    );
  }
}

/// @nodoc

class _$ChatErrorImpl implements ChatError {
  const _$ChatErrorImpl({
    required this.message,
    final List<MessageEntity>? messages,
    this.conversationId,
  }) : _messages = messages;

  @override
  final String message;
  final List<MessageEntity>? _messages;
  @override
  List<MessageEntity>? get messages {
    final value = _messages;
    if (value == null) return null;
    if (_messages is EqualUnmodifiableListView) return _messages;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(value);
  }

  @override
  final int? conversationId;

  @override
  String toString() {
    return 'ChatState.error(message: $message, messages: $messages, conversationId: $conversationId)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ChatErrorImpl &&
            (identical(other.message, message) || other.message == message) &&
            const DeepCollectionEquality().equals(other._messages, _messages) &&
            (identical(other.conversationId, conversationId) ||
                other.conversationId == conversationId));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    message,
    const DeepCollectionEquality().hash(_messages),
    conversationId,
  );

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ChatErrorImplCopyWith<_$ChatErrorImpl> get copyWith =>
      __$$ChatErrorImplCopyWithImpl<_$ChatErrorImpl>(this, _$identity);

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )
    loaded,
    required TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )
    streaming,
    required TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )
    error,
  }) {
    return error(message, messages, conversationId);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult? Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult? Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
  }) {
    return error?.call(message, messages, conversationId);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      bool isStreaming,
    )?
    loaded,
    TResult Function(
      List<MessageEntity> messages,
      int? conversationId,
      String partialResponse,
    )?
    streaming,
    TResult Function(
      String message,
      List<MessageEntity>? messages,
      int? conversationId,
    )?
    error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(message, messages, conversationId);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ChatInitial value) initial,
    required TResult Function(ChatLoading value) loading,
    required TResult Function(ChatLoaded value) loaded,
    required TResult Function(ChatStreaming value) streaming,
    required TResult Function(ChatError value) error,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ChatInitial value)? initial,
    TResult? Function(ChatLoading value)? loading,
    TResult? Function(ChatLoaded value)? loaded,
    TResult? Function(ChatStreaming value)? streaming,
    TResult? Function(ChatError value)? error,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ChatInitial value)? initial,
    TResult Function(ChatLoading value)? loading,
    TResult Function(ChatLoaded value)? loaded,
    TResult Function(ChatStreaming value)? streaming,
    TResult Function(ChatError value)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }
}

abstract class ChatError implements ChatState {
  const factory ChatError({
    required final String message,
    final List<MessageEntity>? messages,
    final int? conversationId,
  }) = _$ChatErrorImpl;

  String get message;
  List<MessageEntity>? get messages;
  int? get conversationId;

  /// Create a copy of ChatState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ChatErrorImplCopyWith<_$ChatErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
mixin _$ConversationsState {
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(List<ConversationEntity> conversations) loaded,
    required TResult Function(String message) error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(List<ConversationEntity> conversations)? loaded,
    TResult? Function(String message)? error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(List<ConversationEntity> conversations)? loaded,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ConversationsInitial value) initial,
    required TResult Function(ConversationsLoading value) loading,
    required TResult Function(ConversationsLoaded value) loaded,
    required TResult Function(ConversationsError value) error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ConversationsInitial value)? initial,
    TResult? Function(ConversationsLoading value)? loading,
    TResult? Function(ConversationsLoaded value)? loaded,
    TResult? Function(ConversationsError value)? error,
  }) => throw _privateConstructorUsedError;
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ConversationsInitial value)? initial,
    TResult Function(ConversationsLoading value)? loading,
    TResult Function(ConversationsLoaded value)? loaded,
    TResult Function(ConversationsError value)? error,
    required TResult orElse(),
  }) => throw _privateConstructorUsedError;
}

/// @nodoc
abstract class $ConversationsStateCopyWith<$Res> {
  factory $ConversationsStateCopyWith(
    ConversationsState value,
    $Res Function(ConversationsState) then,
  ) = _$ConversationsStateCopyWithImpl<$Res, ConversationsState>;
}

/// @nodoc
class _$ConversationsStateCopyWithImpl<$Res, $Val extends ConversationsState>
    implements $ConversationsStateCopyWith<$Res> {
  _$ConversationsStateCopyWithImpl(this._value, this._then);

  // ignore: unused_field
  final $Val _value;
  // ignore: unused_field
  final $Res Function($Val) _then;

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc
abstract class _$$ConversationsInitialImplCopyWith<$Res> {
  factory _$$ConversationsInitialImplCopyWith(
    _$ConversationsInitialImpl value,
    $Res Function(_$ConversationsInitialImpl) then,
  ) = __$$ConversationsInitialImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ConversationsInitialImplCopyWithImpl<$Res>
    extends _$ConversationsStateCopyWithImpl<$Res, _$ConversationsInitialImpl>
    implements _$$ConversationsInitialImplCopyWith<$Res> {
  __$$ConversationsInitialImplCopyWithImpl(
    _$ConversationsInitialImpl _value,
    $Res Function(_$ConversationsInitialImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$ConversationsInitialImpl implements ConversationsInitial {
  const _$ConversationsInitialImpl();

  @override
  String toString() {
    return 'ConversationsState.initial()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationsInitialImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(List<ConversationEntity> conversations) loaded,
    required TResult Function(String message) error,
  }) {
    return initial();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(List<ConversationEntity> conversations)? loaded,
    TResult? Function(String message)? error,
  }) {
    return initial?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(List<ConversationEntity> conversations)? loaded,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (initial != null) {
      return initial();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ConversationsInitial value) initial,
    required TResult Function(ConversationsLoading value) loading,
    required TResult Function(ConversationsLoaded value) loaded,
    required TResult Function(ConversationsError value) error,
  }) {
    return initial(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ConversationsInitial value)? initial,
    TResult? Function(ConversationsLoading value)? loading,
    TResult? Function(ConversationsLoaded value)? loaded,
    TResult? Function(ConversationsError value)? error,
  }) {
    return initial?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ConversationsInitial value)? initial,
    TResult Function(ConversationsLoading value)? loading,
    TResult Function(ConversationsLoaded value)? loaded,
    TResult Function(ConversationsError value)? error,
    required TResult orElse(),
  }) {
    if (initial != null) {
      return initial(this);
    }
    return orElse();
  }
}

abstract class ConversationsInitial implements ConversationsState {
  const factory ConversationsInitial() = _$ConversationsInitialImpl;
}

/// @nodoc
abstract class _$$ConversationsLoadingImplCopyWith<$Res> {
  factory _$$ConversationsLoadingImplCopyWith(
    _$ConversationsLoadingImpl value,
    $Res Function(_$ConversationsLoadingImpl) then,
  ) = __$$ConversationsLoadingImplCopyWithImpl<$Res>;
}

/// @nodoc
class __$$ConversationsLoadingImplCopyWithImpl<$Res>
    extends _$ConversationsStateCopyWithImpl<$Res, _$ConversationsLoadingImpl>
    implements _$$ConversationsLoadingImplCopyWith<$Res> {
  __$$ConversationsLoadingImplCopyWithImpl(
    _$ConversationsLoadingImpl _value,
    $Res Function(_$ConversationsLoadingImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
}

/// @nodoc

class _$ConversationsLoadingImpl implements ConversationsLoading {
  const _$ConversationsLoadingImpl();

  @override
  String toString() {
    return 'ConversationsState.loading()';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationsLoadingImpl);
  }

  @override
  int get hashCode => runtimeType.hashCode;

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(List<ConversationEntity> conversations) loaded,
    required TResult Function(String message) error,
  }) {
    return loading();
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(List<ConversationEntity> conversations)? loaded,
    TResult? Function(String message)? error,
  }) {
    return loading?.call();
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(List<ConversationEntity> conversations)? loaded,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (loading != null) {
      return loading();
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ConversationsInitial value) initial,
    required TResult Function(ConversationsLoading value) loading,
    required TResult Function(ConversationsLoaded value) loaded,
    required TResult Function(ConversationsError value) error,
  }) {
    return loading(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ConversationsInitial value)? initial,
    TResult? Function(ConversationsLoading value)? loading,
    TResult? Function(ConversationsLoaded value)? loaded,
    TResult? Function(ConversationsError value)? error,
  }) {
    return loading?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ConversationsInitial value)? initial,
    TResult Function(ConversationsLoading value)? loading,
    TResult Function(ConversationsLoaded value)? loaded,
    TResult Function(ConversationsError value)? error,
    required TResult orElse(),
  }) {
    if (loading != null) {
      return loading(this);
    }
    return orElse();
  }
}

abstract class ConversationsLoading implements ConversationsState {
  const factory ConversationsLoading() = _$ConversationsLoadingImpl;
}

/// @nodoc
abstract class _$$ConversationsLoadedImplCopyWith<$Res> {
  factory _$$ConversationsLoadedImplCopyWith(
    _$ConversationsLoadedImpl value,
    $Res Function(_$ConversationsLoadedImpl) then,
  ) = __$$ConversationsLoadedImplCopyWithImpl<$Res>;
  @useResult
  $Res call({List<ConversationEntity> conversations});
}

/// @nodoc
class __$$ConversationsLoadedImplCopyWithImpl<$Res>
    extends _$ConversationsStateCopyWithImpl<$Res, _$ConversationsLoadedImpl>
    implements _$$ConversationsLoadedImplCopyWith<$Res> {
  __$$ConversationsLoadedImplCopyWithImpl(
    _$ConversationsLoadedImpl _value,
    $Res Function(_$ConversationsLoadedImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? conversations = null}) {
    return _then(
      _$ConversationsLoadedImpl(
        conversations: null == conversations
            ? _value._conversations
            : conversations // ignore: cast_nullable_to_non_nullable
                  as List<ConversationEntity>,
      ),
    );
  }
}

/// @nodoc

class _$ConversationsLoadedImpl implements ConversationsLoaded {
  const _$ConversationsLoadedImpl({
    required final List<ConversationEntity> conversations,
  }) : _conversations = conversations;

  final List<ConversationEntity> _conversations;
  @override
  List<ConversationEntity> get conversations {
    if (_conversations is EqualUnmodifiableListView) return _conversations;
    // ignore: implicit_dynamic_type
    return EqualUnmodifiableListView(_conversations);
  }

  @override
  String toString() {
    return 'ConversationsState.loaded(conversations: $conversations)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationsLoadedImpl &&
            const DeepCollectionEquality().equals(
              other._conversations,
              _conversations,
            ));
  }

  @override
  int get hashCode => Object.hash(
    runtimeType,
    const DeepCollectionEquality().hash(_conversations),
  );

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ConversationsLoadedImplCopyWith<_$ConversationsLoadedImpl> get copyWith =>
      __$$ConversationsLoadedImplCopyWithImpl<_$ConversationsLoadedImpl>(
        this,
        _$identity,
      );

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(List<ConversationEntity> conversations) loaded,
    required TResult Function(String message) error,
  }) {
    return loaded(conversations);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(List<ConversationEntity> conversations)? loaded,
    TResult? Function(String message)? error,
  }) {
    return loaded?.call(conversations);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(List<ConversationEntity> conversations)? loaded,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (loaded != null) {
      return loaded(conversations);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ConversationsInitial value) initial,
    required TResult Function(ConversationsLoading value) loading,
    required TResult Function(ConversationsLoaded value) loaded,
    required TResult Function(ConversationsError value) error,
  }) {
    return loaded(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ConversationsInitial value)? initial,
    TResult? Function(ConversationsLoading value)? loading,
    TResult? Function(ConversationsLoaded value)? loaded,
    TResult? Function(ConversationsError value)? error,
  }) {
    return loaded?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ConversationsInitial value)? initial,
    TResult Function(ConversationsLoading value)? loading,
    TResult Function(ConversationsLoaded value)? loaded,
    TResult Function(ConversationsError value)? error,
    required TResult orElse(),
  }) {
    if (loaded != null) {
      return loaded(this);
    }
    return orElse();
  }
}

abstract class ConversationsLoaded implements ConversationsState {
  const factory ConversationsLoaded({
    required final List<ConversationEntity> conversations,
  }) = _$ConversationsLoadedImpl;

  List<ConversationEntity> get conversations;

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ConversationsLoadedImplCopyWith<_$ConversationsLoadedImpl> get copyWith =>
      throw _privateConstructorUsedError;
}

/// @nodoc
abstract class _$$ConversationsErrorImplCopyWith<$Res> {
  factory _$$ConversationsErrorImplCopyWith(
    _$ConversationsErrorImpl value,
    $Res Function(_$ConversationsErrorImpl) then,
  ) = __$$ConversationsErrorImplCopyWithImpl<$Res>;
  @useResult
  $Res call({String message});
}

/// @nodoc
class __$$ConversationsErrorImplCopyWithImpl<$Res>
    extends _$ConversationsStateCopyWithImpl<$Res, _$ConversationsErrorImpl>
    implements _$$ConversationsErrorImplCopyWith<$Res> {
  __$$ConversationsErrorImplCopyWithImpl(
    _$ConversationsErrorImpl _value,
    $Res Function(_$ConversationsErrorImpl) _then,
  ) : super(_value, _then);

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
  @pragma('vm:prefer-inline')
  @override
  $Res call({Object? message = null}) {
    return _then(
      _$ConversationsErrorImpl(
        message: null == message
            ? _value.message
            : message // ignore: cast_nullable_to_non_nullable
                  as String,
      ),
    );
  }
}

/// @nodoc

class _$ConversationsErrorImpl implements ConversationsError {
  const _$ConversationsErrorImpl({required this.message});

  @override
  final String message;

  @override
  String toString() {
    return 'ConversationsState.error(message: $message)';
  }

  @override
  bool operator ==(Object other) {
    return identical(this, other) ||
        (other.runtimeType == runtimeType &&
            other is _$ConversationsErrorImpl &&
            (identical(other.message, message) || other.message == message));
  }

  @override
  int get hashCode => Object.hash(runtimeType, message);

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  @override
  @pragma('vm:prefer-inline')
  _$$ConversationsErrorImplCopyWith<_$ConversationsErrorImpl> get copyWith =>
      __$$ConversationsErrorImplCopyWithImpl<_$ConversationsErrorImpl>(
        this,
        _$identity,
      );

  @override
  @optionalTypeArgs
  TResult when<TResult extends Object?>({
    required TResult Function() initial,
    required TResult Function() loading,
    required TResult Function(List<ConversationEntity> conversations) loaded,
    required TResult Function(String message) error,
  }) {
    return error(message);
  }

  @override
  @optionalTypeArgs
  TResult? whenOrNull<TResult extends Object?>({
    TResult? Function()? initial,
    TResult? Function()? loading,
    TResult? Function(List<ConversationEntity> conversations)? loaded,
    TResult? Function(String message)? error,
  }) {
    return error?.call(message);
  }

  @override
  @optionalTypeArgs
  TResult maybeWhen<TResult extends Object?>({
    TResult Function()? initial,
    TResult Function()? loading,
    TResult Function(List<ConversationEntity> conversations)? loaded,
    TResult Function(String message)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(message);
    }
    return orElse();
  }

  @override
  @optionalTypeArgs
  TResult map<TResult extends Object?>({
    required TResult Function(ConversationsInitial value) initial,
    required TResult Function(ConversationsLoading value) loading,
    required TResult Function(ConversationsLoaded value) loaded,
    required TResult Function(ConversationsError value) error,
  }) {
    return error(this);
  }

  @override
  @optionalTypeArgs
  TResult? mapOrNull<TResult extends Object?>({
    TResult? Function(ConversationsInitial value)? initial,
    TResult? Function(ConversationsLoading value)? loading,
    TResult? Function(ConversationsLoaded value)? loaded,
    TResult? Function(ConversationsError value)? error,
  }) {
    return error?.call(this);
  }

  @override
  @optionalTypeArgs
  TResult maybeMap<TResult extends Object?>({
    TResult Function(ConversationsInitial value)? initial,
    TResult Function(ConversationsLoading value)? loading,
    TResult Function(ConversationsLoaded value)? loaded,
    TResult Function(ConversationsError value)? error,
    required TResult orElse(),
  }) {
    if (error != null) {
      return error(this);
    }
    return orElse();
  }
}

abstract class ConversationsError implements ConversationsState {
  const factory ConversationsError({required final String message}) =
      _$ConversationsErrorImpl;

  String get message;

  /// Create a copy of ConversationsState
  /// with the given fields replaced by the non-null parameter values.
  @JsonKey(includeFromJson: false, includeToJson: false)
  _$$ConversationsErrorImplCopyWith<_$ConversationsErrorImpl> get copyWith =>
      throw _privateConstructorUsedError;
}
