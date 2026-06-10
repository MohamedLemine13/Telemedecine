import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/patient_service.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Patient prescriptions — the mobile "medical record" tab. Each card opens the
/// full medication details (the doctor's instructions) in a bottom sheet.
class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  bool _loading = true;
  List<Map<String, dynamic>> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await context.read<PatientService>().prescriptions();
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Prescriptions')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _items.isEmpty
              ? const EmptyState(
                  icon: Icons.medication_outlined,
                  title: 'No prescriptions yet',
                  subtitle:
                      'After a consultation, prescriptions your doctor issues '
                      'will appear here to view and download.',
                )
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(12),
                    itemCount: _items.length,
                    itemBuilder: (_, i) {
                      final p = _items[i];
                      return Card(
                        child: ListTile(
                          leading: const Icon(Icons.medication, color: Palette.primary),
                          title: Text('${p['title'] ?? 'Prescription'}',
                              style: const TextStyle(fontWeight: FontWeight.w700)),
                          subtitle: Text(_subtitle(p)),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _showDetail(p),
                        ),
                      );
                    },
                  ),
                ),
    );
  }

  String _subtitle(Map<String, dynamic> p) {
    final doctor = (p['doctorName'] ?? '') as String;
    final issued = (p['issuedAt'] ?? '') as String;
    final date = issued.length >= 10 ? issued.substring(0, 10) : issued;
    return [if (doctor.isNotEmpty) doctor, if (date.isNotEmpty) date].join(' · ');
  }

  void _showDetail(Map<String, dynamic> p) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (_) => DraggableScrollableSheet(
        expand: false,
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (_, controller) => ListView(
          controller: controller,
          padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
          children: [
            Text('${p['title'] ?? 'Prescription'}',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 6),
            Text(_subtitle(p), style: const TextStyle(color: Palette.muted)),
            const Divider(height: 28),
            Text('${p['body'] ?? ''}', style: const TextStyle(height: 1.5)),
          ],
        ),
      ),
    );
  }
}
