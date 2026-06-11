/// Build-time configuration, injected with `--dart-define`.
///
/// `API_BASE_URL` is the only knob that changes between targets. It points at
/// the project's **nginx** front door (the same one the web app uses), which
/// terminates TLS and reverse-proxies `/api`, `/ws` and `/lk`:
///   - Real device / phone →  https://<your-LAN-or-public-ip>:4443  (default)
///   - Android emulator    →  http://10.0.2.2:8080  (backend direct, dev only)
///
/// Over HTTPS the app is a secure origin end-to-end and the bundled project CA
/// (assets/ca.cert.pem + android res/raw) makes the self-managed certificate
/// trusted with no per-device cert install. LiveKit signalling is derived from
/// the same host — over https it uses the same-origin `wss://host/lk` proxy
/// (mirroring the web client); over http it falls back to `ws://host:7880`.
class AppConfig {
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://187.124.219.82:4443',
  );

  /// True when the app talks to the backend over TLS (the nginx front door).
  static bool get isSecure => Uri.parse(apiBaseUrl).scheme == 'https';

  /// Resolve the LiveKit URL the room should connect to.
  ///
  /// The backend returns a `livekitUrl` built from server-side config (often
  /// `localhost`/an internal host) that a phone cannot reach, so we always
  /// rebuild it from the API host:
  ///   - HTTPS build → `wss://<host>:<port>/lk` — the same-origin nginx proxy
  ///     that already exists for the web client (TLS, no extra firewall port).
  ///   - HTTP build  → `ws://<host>:7880` — LiveKit's published port directly.
  static String livekitUrlFor(String serverProvidedUrl) {
    final api = Uri.parse(apiBaseUrl);
    // Same-origin (web) build: API host is empty — the server URL is already
    // reachable from the host browser, so use it unchanged.
    if (api.host.isEmpty) return serverProvidedUrl;

    if (api.scheme == 'https') {
      final port = api.hasPort ? api.port : 443;
      return Uri(scheme: 'wss', host: api.host, port: port, path: '/lk').toString();
    }

    final server = Uri.tryParse(serverProvidedUrl);
    final scheme = (server?.scheme == 'wss') ? 'wss' : 'ws';
    final port = (server != null && server.hasPort) ? server.port : 7880;
    return Uri(scheme: scheme, host: api.host, port: port).toString();
  }
}
