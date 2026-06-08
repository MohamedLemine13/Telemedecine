import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api_client.dart';
import 'core/auth_store.dart';
import 'services/appointment_service.dart';
import 'services/consultation_service.dart';
import 'services/doctor_service.dart';
import 'services/patient_service.dart';
import 'ui/auth/login_screen.dart';
import 'ui/home/home_shell.dart';
import 'ui/theme.dart';

class TelemedApp extends StatelessWidget {
  const TelemedApp({super.key, required this.auth});
  final AuthStore auth;

  @override
  Widget build(BuildContext context) {
    // One authenticated client, shared by every service.
    final api = ApiClient(auth);
    return MultiProvider(
      providers: [
        ChangeNotifierProvider.value(value: auth),
        Provider<ApiClient>.value(value: api),
        Provider(create: (_) => DoctorService(api)),
        Provider(create: (_) => AppointmentService(api)),
        Provider(create: (_) => ConsultationService(api)),
        Provider(create: (_) => PatientService(api)),
      ],
      child: MaterialApp(
        title: 'Telemedecine',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        home: const _Gate(),
      ),
    );
  }
}

/// Swaps between the login screen and the home shell based on auth state.
class _Gate extends StatelessWidget {
  const _Gate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    if (!auth.ready) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    return auth.isLoggedIn ? const HomeShell() : const LoginScreen();
  }
}
