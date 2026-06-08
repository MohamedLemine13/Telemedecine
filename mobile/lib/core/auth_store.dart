import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'config.dart';
import 'models.dart';

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
  List<String> _roles = [];
  bool _ready = false;

  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  List<String> get roles => _roles;

  bool get ready => _ready;
  bool get isLoggedIn => _accessToken != null;
  bool get isPatient => _roles.contains('ROLE_PATIENT');
  bool get isDoctor => _roles.contains('ROLE_DOCTOR');
  bool get isAdmin => _roles.contains('ROLE_ADMIN');

  Future<void> bootstrap() async {
    try {
      _accessToken = await _storage.read(key: _kAccess);
      _refreshToken = await _storage.read(key: _kRefresh);
      if (_accessToken != null) _roles = _parseRoles(_accessToken!);
    } catch (_) {
      _accessToken = null;
      _refreshToken = null;
      _roles = [];
    }
    _ready = true;
    notifyListeners();
  }

  Future<void> _persist(TokenPair t) async {
    _accessToken = t.accessToken;
    _refreshToken = t.refreshToken;
    _roles = _parseRoles(t.accessToken);
    try {
      await _storage.write(key: _kAccess, value: t.accessToken);
      await _storage.write(key: _kRefresh, value: t.refreshToken);
    } catch (_) {}
    notifyListeners();
  }

  String? pendingTfa;

  Future<String?> login(String email, String password) async {
    try {
      final res = await _raw.post('/api/auth/login', data: {
        'email': email,
        'password': password,
      });
      if (res.statusCode != 200) return _detail(res) ?? 'Invalid email or password.';
      final result = LoginResult.fromJson(res.data as Map<String, dynamic>);
      if (result.tfaRequired) {
        pendingTfa = result.tfaChallengeToken;
        notifyListeners();
        return null;
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
    _roles = [];
    pendingTfa = null;
    try {
      await _storage.delete(key: _kAccess);
      await _storage.delete(key: _kRefresh);
    } catch (_) {}
    notifyListeners();
    if (rt != null) {
      try {
        await _raw.post('/api/auth/logout', data: {'refreshToken': rt});
      } catch (_) {}
    }
  }

  // Decode JWT payload and extract roles – no crypto lib needed, server already
  // validated the token; we just read the claims.
  static List<String> _parseRoles(String token) {
    try {
      final parts = token.split('.');
      if (parts.length < 2) return [];
      var payload = parts[1].replaceAll('-', '+').replaceAll('_', '/');
      while (payload.length % 4 != 0) {
        payload += '=';
      }
      final claims =
          jsonDecode(utf8.decode(base64.decode(payload))) as Map<String, dynamic>;
      final raw = claims['roles'];
      if (raw is List) return raw.map((e) => e.toString()).toList();
    } catch (_) {}
    return [];
  }

  static String? _detail(Response res) {
    final data = res.data;
    if (data is Map && data['detail'] is String) return data['detail'] as String;
    if (data is Map && data['message'] is String) return data['message'] as String;
    return null;
  }

  static String _network(DioException e) =>
      'Cannot reach the server. Check that the backend is running.\n(${e.message})';
}
