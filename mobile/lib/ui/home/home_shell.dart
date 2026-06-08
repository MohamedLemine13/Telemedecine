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
        backgroundColor: Colors.white,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.event_outlined),
            selectedIcon: Icon(Icons.event, color: Palette.primary),
            label: 'Appointments',
          ),
          NavigationDestination(
            icon: Icon(Icons.search_outlined),
            selectedIcon: Icon(Icons.search, color: Palette.primary),
            label: 'Doctors',
          ),
          NavigationDestination(
            icon: Icon(Icons.description_outlined),
            selectedIcon: Icon(Icons.description, color: Palette.primary),
            label: 'Records',
          ),
          NavigationDestination(
            icon: Icon(Icons.person_outline),
            selectedIcon: Icon(Icons.person, color: Palette.primary),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
