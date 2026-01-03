// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'chat_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

String _$isStreamingHash() => r'89bfae48ec49ad81271cb0c7f9a7688de5bc598c';

/// Provider for checking if currently streaming
///
/// Copied from [isStreaming].
@ProviderFor(isStreaming)
final isStreamingProvider = AutoDisposeProvider<bool>.internal(
  isStreaming,
  name: r'isStreamingProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$isStreamingHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef IsStreamingRef = AutoDisposeProviderRef<bool>;
String _$chatMessagesHash() => r'8136d8f5119db4e70f2d82e63a7812d82683f649';

/// Provider for current messages
///
/// Copied from [chatMessages].
@ProviderFor(chatMessages)
final chatMessagesProvider = AutoDisposeProvider<List<MessageEntity>>.internal(
  chatMessages,
  name: r'chatMessagesProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$chatMessagesHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef ChatMessagesRef = AutoDisposeProviderRef<List<MessageEntity>>;
String _$partialResponseHash() => r'6337923f47c5f2edae07e607ccb8fdbf1a57be43';

/// Provider for partial response during streaming
///
/// Copied from [partialResponse].
@ProviderFor(partialResponse)
final partialResponseProvider = AutoDisposeProvider<String>.internal(
  partialResponse,
  name: r'partialResponseProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$partialResponseHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

@Deprecated('Will be removed in 3.0. Use Ref instead')
// ignore: unused_element
typedef PartialResponseRef = AutoDisposeProviderRef<String>;
String _$chatNotifierHash() => r'8d22e4bc9d67cff30122cc14a0cb5eeaac51839a';

/// Chat notifier that manages chat state and streaming
///
/// Copied from [ChatNotifier].
@ProviderFor(ChatNotifier)
final chatNotifierProvider = NotifierProvider<ChatNotifier, ChatState>.internal(
  ChatNotifier.new,
  name: r'chatNotifierProvider',
  debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
      ? null
      : _$chatNotifierHash,
  dependencies: null,
  allTransitiveDependencies: null,
);

typedef _$ChatNotifier = Notifier<ChatState>;
String _$conversationsNotifierHash() =>
    r'59d762dc069f71e0f7392b430dbc404dbc04d847';

/// Conversations list notifier
///
/// Copied from [ConversationsNotifier].
@ProviderFor(ConversationsNotifier)
final conversationsNotifierProvider =
    AutoDisposeNotifierProvider<
      ConversationsNotifier,
      ConversationsState
    >.internal(
      ConversationsNotifier.new,
      name: r'conversationsNotifierProvider',
      debugGetCreateSourceHash: const bool.fromEnvironment('dart.vm.product')
          ? null
          : _$conversationsNotifierHash,
      dependencies: null,
      allTransitiveDependencies: null,
    );

typedef _$ConversationsNotifier = AutoDisposeNotifier<ConversationsState>;
// ignore_for_file: type=lint
// ignore_for_file: subtype_of_sealed_class, invalid_use_of_internal_member, invalid_use_of_visible_for_testing_member, deprecated_member_use_from_same_package
