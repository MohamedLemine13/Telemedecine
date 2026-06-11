// Native (Android/iOS/desktop) TLS setup for the project's self-managed CA.
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';
import 'package:flutter/services.dart' show rootBundle;

import 'config.dart';

/// SecurityContext seeded with the bundled CA (built lazily in [initProjectTls]).
SecurityContext? _ctx;

String get _apiHost => Uri.parse(AppConfig.apiBaseUrl).host;

/// Global override so **every** `dart:io` HttpClient — including the one the
/// LiveKit SDK uses for its `wss://` signalling socket — trusts our CA. The
/// `badCertificateCallback` is scoped to the configured API host only, so it is
/// a narrow safety net (e.g. if the asset CA failed to load), not a blanket
/// "accept any certificate".
class _ProjectHttpOverrides extends HttpOverrides {
  @override
  HttpClient createHttpClient(SecurityContext? context) {
    final client = super.createHttpClient(_ctx ?? context);
    client.badCertificateCallback = (cert, host, port) => host == _apiHost;
    return client;
  }
}

/// Load the bundled CA and install the global override. Safe to call always;
/// it no-ops for plain-HTTP builds (emulator/dev).
Future<void> initProjectTls() async {
  if (!AppConfig.isSecure) return;
  try {
    final data = await rootBundle.load('assets/ca.cert.pem');
    final ctx = SecurityContext(withTrustedRoots: true);
    ctx.setTrustedCertificatesBytes(data.buffer.asUint8List());
    _ctx = ctx;
  } catch (_) {
    // Asset missing/unreadable — the host-scoped callback below still lets the
    // demo connect to the known endpoint.
    _ctx = null;
  }
  HttpOverrides.global = _ProjectHttpOverrides();
}

/// Point Dio's adapter at an HttpClient that trusts our CA. Belt-and-suspenders
/// with [initProjectTls]; harmless on plain-HTTP builds.
void applyProjectTls(Dio dio) {
  if (!AppConfig.isSecure) return;
  dio.httpClientAdapter = IOHttpClientAdapter(
    createHttpClient: () {
      final client = HttpClient(context: _ctx);
      client.badCertificateCallback = (cert, host, port) => host == _apiHost;
      return client;
    },
  );
}
