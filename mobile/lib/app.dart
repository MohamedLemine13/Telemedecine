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

class _Gate extends StatelessWidget {
  const _Gate();

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthStore>();
    if (!auth.ready) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }
    if (!auth.isLoggedIn) return const LoginScreen();
    // Doctors and admins must use the web app – this app is patient-only.
    if (!auth.isPatient) return const _WrongRoleScreen();
    return const HomeShell();
  }
}

class _WrongRoleScreen extends StatelessWidget {
  const _WrongRoleScreen();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: 80,
                  height: 80,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFF3CD),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.lock_person_outlined,
                      size: 44, color: Color(0xFFB45309)),
                ),
                const SizedBox(height: 24),
                const Text(
                  'Patient app only',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.w800),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 10),
                const Text(
                  'This app is for patients only.\nDoctors and admins should use the web portal.',
                  style: TextStyle(color: Color(0xFF6B7280), fontSize: 14, height: 1.5),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                FilledButton.icon(
                  onPressed: () => context.read<AuthStore>().logout(),
                  icon: const Icon(Icons.logout),
                  label: const Text('Sign out'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
