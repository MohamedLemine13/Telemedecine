import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/auth_store.dart';
import '../../core/config.dart';
import '../../core/models.dart';
import '../../services/patient_service.dart';
import '../theme.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  PatientProfile? _me;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final me = await context.read<PatientService>().me();
      if (!mounted) return;
      setState(() {
        _me = me;
        _loading = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final me = _me;
    return Scaffold(
      appBar: AppBar(title: const Text('Profile')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                const SizedBox(height: 8),
                Center(
                  child: CircleAvatar(
                    radius: 36,
                    backgroundColor: Palette.primaryTint,
                    child: const Icon(Icons.person,
                        size: 40, color: Palette.primary),
                  ),
                ),
                const SizedBox(height: 12),
                Center(
                  child: Text(
                    me?.displayName ?? 'Patient',
                    style: const TextStyle(
                        fontSize: 18, fontWeight: FontWeight.w800),
                  ),
                ),
                if (me != null)
                  Center(
                    child: Text(me.email,
                        style: const TextStyle(color: Palette.muted)),
                  ),
                const SizedBox(height: 24),
                Card(
                  child: Column(
                    children: [
                      ListTile(
                        leading: const Icon(Icons.dns_outlined),
                        title: const Text('Server'),
                        subtitle: Text(AppConfig.apiBaseUrl),
                        dense: true,
                      ),
                      const Divider(height: 1),
                      ListTile(
                        leading: const Icon(Icons.logout, color: Palette.error),
                        title: const Text('Sign out',
                            style: TextStyle(color: Palette.error)),
                        onTap: () => context.read<AuthStore>().logout(),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                const Center(
                  child: Text('Telemedecine · patient app v0.1',
                      style: TextStyle(color: Palette.muted, fontSize: 12)),
                ),
              ],
            ),
    );
  }
}
