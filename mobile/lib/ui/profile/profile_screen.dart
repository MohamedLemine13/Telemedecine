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
      setState(() { _me = me; _loading = false; });
    } catch (_) {
      if (!mounted) return;
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : CustomScrollView(
              slivers: [
                _heroAppBar(),
                SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      _infoSection(),
                      const SizedBox(height: 16),
                      _settingsSection(),
                      const SizedBox(height: 32),
                      Center(
                        child: Text(
                          'Telemedecine · patient app v0.1',
                          style: TextStyle(color: Palette.muted.withValues(alpha: 0.6), fontSize: 11),
                        ),
                      ),
                      const SizedBox(height: 24),
                    ]),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _heroAppBar() {
    final me = _me;
    final name = me?.displayName ?? 'Patient';
    final initials = _initials(name);
    return SliverAppBar(
      expandedHeight: 200,
      pinned: true,
      backgroundColor: Palette.primary,
      foregroundColor: Colors.white,
      title: const Text('My Profile',
          style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(gradient: Palette.primaryGradient),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                      color: Colors.white.withValues(alpha: 0.4), width: 2),
                ),
                child: Center(
                  child: Text(initials,
                      style: const TextStyle(
                          color: Colors.white,
                          fontSize: 26,
                          fontWeight: FontWeight.w800)),
                ),
              ),
              const SizedBox(height: 10),
              Text(name,
                  style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700)),
              if (me != null)
                Padding(
                  padding: const EdgeInsets.only(top: 2, bottom: 16),
                  child: Text(me.email,
                      style: TextStyle(
                          color: Colors.white.withValues(alpha: 0.7),
                          fontSize: 13)),
                )
              else
                const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }

  Widget _infoSection() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Account',
                style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: Palette.muted,
                    letterSpacing: 0.5)),
            const SizedBox(height: 12),
            _infoRow(
              icon: Icons.badge_outlined,
              label: 'Role',
              value: 'Patient',
              highlight: true,
            ),
            const Divider(height: 20),
            _infoRow(
              icon: Icons.dns_outlined,
              label: 'Server',
              value: AppConfig.apiBaseUrl,
            ),
          ],
        ),
      ),
    );
  }

  Widget _settingsSection() {
    return Card(
      child: Column(
        children: [
          ListTile(
            leading: Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: const Color(0xFFFDEAE7),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.logout, color: Palette.error, size: 18),
            ),
            title: const Text('Sign out',
                style: TextStyle(
                    color: Palette.error, fontWeight: FontWeight.w600)),
            trailing: const Icon(Icons.chevron_right, color: Palette.muted),
            onTap: () => _confirmLogout(context),
          ),
        ],
      ),
    );
  }

  Widget _infoRow({
    required IconData icon,
    required String label,
    required String value,
    bool highlight = false,
  }) {
    return Row(
      children: [
        Icon(icon, size: 18, color: Palette.muted),
        const SizedBox(width: 10),
        Text(label,
            style: const TextStyle(color: Palette.muted, fontSize: 13)),
        const Spacer(),
        if (highlight)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: Palette.primaryTint,
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(value,
                style: const TextStyle(
                    color: Palette.primary,
                    fontSize: 12,
                    fontWeight: FontWeight.w700)),
          )
        else
          Text(value,
              style: const TextStyle(fontSize: 13, color: Palette.ink)),
      ],
    );
  }

  Future<void> _confirmLogout(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Sign out?', style: TextStyle(fontWeight: FontWeight.w700)),
        content: const Text('You will need to sign in again to access your account.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Palette.error),
            child: const Text('Sign out'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      context.read<AuthStore>().logout();
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'P';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }
}
