import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Keys for secure storage
class StorageKeys {
  static const String sessionId = 'session_id';
  static const String userId = 'user_id';
  static const String userJson = 'user_json';
  static const String sessionJson = 'session_json';
  static const String pinHash = 'pin_hash';
  static const String pinSalt = 'pin_salt';
  static const String rememberMe = 'remember_me';
  static const String lastLoginAt = 'last_login_at';
}

/// Wrapper around FlutterSecureStorage with platform-specific configurations
class SecureStorageService {
  late final FlutterSecureStorage _storage;

  SecureStorageService() {
    _storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(
        encryptedSharedPreferences: true,
        sharedPreferencesName: 'justice_companion_secure_prefs',
        preferencesKeyPrefix: 'jc_',
      ),
      iOptions: IOSOptions(
        accessibility: KeychainAccessibility.first_unlock,
        accountName: 'JusticeCompanion',
      ),
      lOptions: LinuxOptions(),
      wOptions: WindowsOptions(),
      mOptions: MacOsOptions(
        accessibility: KeychainAccessibility.first_unlock,
        accountName: 'JusticeCompanion',
      ),
    );
  }

  /// Write a string value
  Future<void> write(String key, String value) async {
    await _storage.write(key: key, value: value);
  }

  /// Read a string value
  Future<String?> read(String key) async {
    return await _storage.read(key: key);
  }

  /// Delete a value
  Future<void> delete(String key) async {
    await _storage.delete(key: key);
  }

  /// Delete all values
  Future<void> deleteAll() async {
    await _storage.deleteAll();
  }

  /// Check if key exists
  Future<bool> containsKey(String key) async {
    return await _storage.containsKey(key: key);
  }

  /// Read all values
  Future<Map<String, String>> readAll() async {
    return await _storage.readAll();
  }

  // ============ Session Management ============

  /// Save session ID
  Future<void> saveSessionId(String sessionId) async {
    await write(StorageKeys.sessionId, sessionId);
  }

  /// Get session ID
  Future<String?> getSessionId() async {
    return await read(StorageKeys.sessionId);
  }

  /// Clear session ID
  Future<void> clearSessionId() async {
    await delete(StorageKeys.sessionId);
  }

  /// Check if session exists
  Future<bool> hasSession() async {
    return await containsKey(StorageKeys.sessionId);
  }

  // ============ User Data Caching ============

  /// Save user data as JSON
  Future<void> saveUserJson(Map<String, dynamic> userJson) async {
    await write(StorageKeys.userJson, jsonEncode(userJson));
  }

  /// Get cached user data
  Future<Map<String, dynamic>?> getUserJson() async {
    final json = await read(StorageKeys.userJson);
    if (json == null) return null;
    return jsonDecode(json) as Map<String, dynamic>;
  }

  /// Save session data as JSON
  Future<void> saveSessionJson(Map<String, dynamic> sessionJson) async {
    await write(StorageKeys.sessionJson, jsonEncode(sessionJson));
  }

  /// Get cached session data
  Future<Map<String, dynamic>?> getSessionJson() async {
    final json = await read(StorageKeys.sessionJson);
    if (json == null) return null;
    return jsonDecode(json) as Map<String, dynamic>;
  }

  /// Save user ID
  Future<void> saveUserId(int userId) async {
    await write(StorageKeys.userId, userId.toString());
  }

  /// Get user ID
  Future<int?> getUserId() async {
    final id = await read(StorageKeys.userId);
    if (id == null) return null;
    return int.tryParse(id);
  }

  // ============ PIN Management ============

  /// Save PIN hash and salt
  Future<void> savePinCredentials(String hash, String salt) async {
    await write(StorageKeys.pinHash, hash);
    await write(StorageKeys.pinSalt, salt);
  }

  /// Get PIN hash
  Future<String?> getPinHash() async {
    return await read(StorageKeys.pinHash);
  }

  /// Get PIN salt
  Future<String?> getPinSalt() async {
    return await read(StorageKeys.pinSalt);
  }

  /// Check if PIN is configured
  Future<bool> isPinConfigured() async {
    final hash = await getPinHash();
    final salt = await getPinSalt();
    return hash != null && salt != null;
  }

  /// Clear PIN credentials
  Future<void> clearPinCredentials() async {
    await delete(StorageKeys.pinHash);
    await delete(StorageKeys.pinSalt);
  }

  // ============ Preferences ============

  /// Save remember me preference
  Future<void> saveRememberMe(bool value) async {
    await write(StorageKeys.rememberMe, value.toString());
  }

  /// Get remember me preference
  Future<bool> getRememberMe() async {
    final value = await read(StorageKeys.rememberMe);
    return value == 'true';
  }

  /// Save last login timestamp
  Future<void> saveLastLoginAt(DateTime dateTime) async {
    await write(StorageKeys.lastLoginAt, dateTime.toIso8601String());
  }

  /// Get last login timestamp
  Future<DateTime?> getLastLoginAt() async {
    final value = await read(StorageKeys.lastLoginAt);
    if (value == null) return null;
    return DateTime.tryParse(value);
  }

  // ============ Clear All Auth Data ============

  /// Clear all authentication-related data
  Future<void> clearAuthData() async {
    await clearSessionId();
    await delete(StorageKeys.userJson);
    await delete(StorageKeys.sessionJson);
    await delete(StorageKeys.userId);
    await delete(StorageKeys.lastLoginAt);
    // Note: Does NOT clear PIN credentials - user must explicitly remove
  }

  /// Clear everything including PIN
  Future<void> clearAllData() async {
    await deleteAll();
  }
}
