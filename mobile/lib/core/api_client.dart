import 'package:dio/dio.dart';

import 'auth_store.dart';
import 'config.dart';
import 'tls.dart';

/// Authenticated HTTP client. Attaches the bearer token to every request and,
/// on a 401, transparently refreshes the token pair once and retries.
class ApiClient {
  ApiClient(this._auth) : dio = Dio(BaseOptions(baseUrl: AppConfig.apiBaseUrl)) {
    applyProjectTls(dio); // trust the project CA on HTTPS builds
    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        final token = _auth.accessToken;
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        handler.next(options);
      },
      onError: (e, handler) async {
        final isAuthCall = e.requestOptions.path.contains('/api/auth/');
        if (e.response?.statusCode == 401 && !isAuthCall && !_retried(e)) {
          final ok = await _auth.refresh();
          if (ok) {
            final req = e.requestOptions;
            req.extra['retried'] = true;
            req.headers['Authorization'] = 'Bearer ${_auth.accessToken}';
            try {
              final clone = await dio.fetch(req);
              return handler.resolve(clone);
            } on DioException catch (err) {
              return handler.next(err);
            }
          }
        }
        handler.next(e);
      },
    ));
  }

  final AuthStore _auth;
  final Dio dio;

  bool _retried(DioException e) => e.requestOptions.extra['retried'] == true;
}
