import 'package:flutter/material.dart';

import 'app.dart';
import 'core/auth_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final auth = AuthStore();
  await auth.bootstrap();
  runApp(TelemedApp(auth: auth));
}
