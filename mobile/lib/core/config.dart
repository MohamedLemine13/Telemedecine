/// Build-time configuration, injected with `--dart-define`.
///
/// `API_BASE_URL` is the only knob that changes between targets:
///   - Android emulator  →  http://10.0.2.2:8080   (10.0.2.2 == host loopback)
///   - Real device       →  http://<your-LAN-ip>:8080
///
/// The LiveKit signalling URL is derived from the same host (LiveKit runs on
/// :7880 on the same machine as the backend in the dev compose stack), so there
/// is nothing else to configure.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080',
  );

  /// LiveKit ws:// URL on the same host as the API, port 7880.
  /// The backend also returns a `livekitUrl` in the join response, but it is
  /// built from server-side config (often `localhost`) which a phone cannot
  /// reach — so we rewrite the host to match the API host. See
  /// [livekitUrlFor].
  static String livekitUrlFor(String serverProvidedUrl) {
    final api = Uri.parse(apiBaseUrl);
    // Same-origin (web) build: API host is empty. The server-provided URL
    // (e.g. ws://localhost:7880) is already reachable from the host browser,
    // so use it unchanged.
    if (api.host.isEmpty) return serverProvidedUrl;
    final server = Uri.tryParse(serverProvidedUrl);
    final scheme = (server?.scheme == 'wss') ? 'wss' : 'ws';
    final port = (server != null && server.hasPort) ? server.port : 7880;
    return Uri(scheme: scheme, host: api.host, port: port).toString();
  }
}
