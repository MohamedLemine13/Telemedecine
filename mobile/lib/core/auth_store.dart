import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'config.dart';
import 'models.dart';

/// Single source of truth for authentication. Holds the token pair in memory
/// and persists it to the platform keystore so the session survives restarts.
///
/// Auth endpoints (`/api/auth/*`) are called through a bare [Dio] with no
/// bearer interceptor — login/signup are public and refresh carries the refresh
/// token in the body — which keeps this class free of any dependency cycle with
/// the authenticated [Dio].
class AuthStore extends ChangeNotifier {
  AuthStore() : _raw = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl)) {
    _raw.options.validateStatus = (s) => s != null && s < 500;
  }

  final Dio _raw;
  final _storage = const FlutterSecureStorage();

  static const _kAccess = 'access_token';
  static const _kRefresh = 'refresh_token';

  String? _accessToken;
  String? _refreshToken;
  bool _ready = false;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;

  /// True once [bootstrap] has restored (or confirmed absence of) a session.
  bool get ready => _ready;
  bool get isLoggedIn => _accessToken != null;

  /// Load any persisted tokens at app start. On a Linux desktop with no system
  /// keyring (Secret Service), reads throw — we swallow that and start logged
  /// out rather than crashing.
  Future<void> bootstrap() async {
    try {
      _accessToken = await _storage.read(key: _kAccess);
      _refreshToken = await _storage.read(key: _kRefresh);
    } catch (_) {
      _accessToken = null;
      _refreshToken = null;
    }
    _ready = true;
    notifyListeners();
  }

  Future<void> _persist(TokenPair t) async {
    // Keep tokens in memory unconditionally so the session works even when the
    // platform has no secure storage backend (e.g. a keyring-less desktop).
    _accessToken = t.accessToken;
    _refreshToken = t.refreshToken;
    try {
      await _storage.write(key: _kAccess, value: t.accessToken);
      await _storage.write(key: _kRefresh, value: t.refreshToken);
    } catch (_) {/* no keyring — tokens live for this session only */}
    notifyListeners();
  }

  /// Returns null on success, otherwise a human-readable error.
  /// A non-null [LoginResult] with `tfaRequired` is surfaced via [pendingTfa].
  String? pendingTfa;

  Future<String?> login(String email, String password) async {
    try {
      final res = await _raw.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      if (res.statusCode != 200) {
        return _detail(res) ?? 'Invalid email or password.';
      }
      final result = LoginResult.fromJson(res.data as Map<String, dynamic>);
      if (result.tfaRequired) {
        pendingTfa = result.tfaChallengeToken;
        notifyListeners();
        return null; // caller routes to the 2FA screen
      }
      await _persist(result.tokens!);
      return null;
    } on DioException catch (e) {
      return _network(e);
    }
  }

  Future<String?> verifyTfa(String code) async {
    final challenge = pendingTfa;
    if (challenge == null) return 'No pending 2FA challenge.';
    try {
      final res = await _raw.post('/api/auth/2fa/verify', data: {
        'challengeToken': challenge,
        'code': code,
      });
      if (res.statusCode != 200) return _detail(res) ?? 'Invalid code.';
      await _persist(TokenPair.fromJson(res.data as Map<String, dynamic>));
      pendingTfa = null;
      return null;
    } on DioException catch (e) {
      return _network(e);
    }
  }

  Future<String?> signup(String email, String password) async {
    try {
      final res = await _raw.post('/api/auth/signup', data: {
        'email': email,
        'password': password,
        'role': 'ROLE_PATIENT',
      });
      if (res.statusCode != 201 && res.statusCode != 200) {
        return _detail(res) ?? 'Could not create the account.';
      }
      await _persist(TokenPair.fromJson(res.data as Map<String, dynamic>));
      return null;
    } on DioException catch (e) {
      return _network(e);
    }
  }

  /// Exchange the refresh token for a fresh pair. Returns true on success.
  /// Used by the authenticated client's 401 interceptor.
  Future<bool> refresh() async {
    final rt = _refreshToken;
    if (rt == null) return false;
    try {
      final res = await _raw.post('/api/auth/refresh', data: {'refreshToken': rt});
      if (res.statusCode != 200) {
        await logout();
        return false;
      }
      await _persist(TokenPair.fromJson(res.data as Map<String, dynamic>));
      return true;
    } on DioException {
      return false;
    }
  }

  Future<void> logout() async {
    final rt = _refreshToken;
    _accessToken = null;
    _refreshToken = null;
    pendingTfa = null;
    try {
      await _storage.delete(key: _kAccess);
      await _storage.delete(key: _kRefresh);
    } catch (_) {/* no keyring — nothing persisted to clear */}
    notifyListeners();
    if (rt != null) {
      try {
        await _raw.post('/api/auth/logout', data: {'refreshToken': rt});
      } catch (_) {/* best-effort */}
    }
  }

  static String? _detail(Response res) {
    final data = res.data;
    if (data is Map && data['detail'] is String) return data['detail'] as String;
    if (data is Map && data['message'] is String) return data['message'] as String;
    return null;
  }

  static String _network(DioException e) =>
      'Cannot reach the server. Check that the backend is running and the API URL is correct.\n(${e.message})';
}
