import 'package:flutter/material.dart';

import 'app.dart';
import 'core/auth_store.dart';
import 'core/tls.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  // Trust the project CA before any network call (HTTPS REST + LiveKit wss).
  await initProjectTls();
  final auth = AuthStore();
  await auth.bootstrap();
  runApp(TelemedApp(auth: auth));
}
