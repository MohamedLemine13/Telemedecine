/// Trust the project's self-managed CA so the app can speak HTTPS/WSS to the
/// nginx front door (which carries a cert signed by `pki/certs/ca.cert.pem`).
///
/// Implementation is platform-split: on native (`dart:io`) it installs the CA
/// and a host-scoped certificate override that covers **both** Dio (REST) and
/// the LiveKit signalling WebSocket (both go through `dart:io`'s own TLS stack,
/// which ignores Android's `network_security_config`). On web it is a no-op —
/// the browser already governs TLS.
export 'tls_web.dart' if (dart.library.io) 'tls_io.dart';
