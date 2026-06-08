import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../services/patient_service.dart';
import '../widgets/common.dart';

/// Prescriptions are a Phase-5 backend feature. The service swallows a missing
/// endpoint and returns an empty list, so this screen shows a friendly
/// "coming soon" state until the backend ships.
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
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: _items.length,
                  itemBuilder: (_, i) {
                    final p = _items[i];
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.medication),
                        title: Text('${p['title'] ?? 'Prescription'}'),
                        subtitle: Text('${p['issuedAt'] ?? ''}'),
                      ),
                    );
                  },
                ),
    );
  }
}
