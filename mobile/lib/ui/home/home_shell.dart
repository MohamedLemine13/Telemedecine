import 'package:flutter/material.dart';

import '../appointments/appointments_screen.dart';
import '../doctors/doctors_screen.dart';
import '../prescriptions/prescriptions_screen.dart';
import '../profile/profile_screen.dart';
import '../theme.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key});

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  // Rebuilt key per tab so pull-to-refresh / fresh fetch happens on revisit
  // of the appointments tab after booking.
  final _appointmentsKey = GlobalKey<AppointmentsScreenState>();

  late final List<Widget> _tabs = [
    AppointmentsScreen(key: _appointmentsKey),
    DoctorsScreen(onBooked: _goToAppointments),
    const PrescriptionsScreen(),
    const ProfileScreen(),
  ];

  void _goToAppointments() {
    setState(() => _index = 0);
    _appointmentsKey.currentState?.refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: _tabs),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        indicatorColor: Palette.primaryTint,
        destinations: const [
          NavigationDestination(
              icon: Icon(Icons.event_outlined),
              selectedIcon: Icon(Icons.event),
              label: 'Appointments'),
          NavigationDestination(
              icon: Icon(Icons.search_outlined),
              selectedIcon: Icon(Icons.search),
              label: 'Find a doctor'),
          NavigationDestination(
              icon: Icon(Icons.description_outlined),
              selectedIcon: Icon(Icons.description),
              label: 'Prescriptions'),
          NavigationDestination(
              icon: Icon(Icons.person_outline),
              selectedIcon: Icon(Icons.person),
              label: 'Profile'),
        ],
      ),
    );
  }
}
