import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../services/doctor_service.dart';
import '../theme.dart';
import '../widgets/common.dart';
import 'doctor_detail_screen.dart';

class DoctorsScreen extends StatefulWidget {
  const DoctorsScreen({super.key, required this.onBooked});

  /// Called after a successful booking so the shell can jump to Appointments.
  final VoidCallback onBooked;

  @override
  State<DoctorsScreen> createState() => _DoctorsScreenState();
}

class _DoctorsScreenState extends State<DoctorsScreen> {
  bool _loading = true;
  String? _error;
  List<Doctor> _doctors = const [];
  final _query = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await context.read<DoctorService>().search();
      if (!mounted) return;
      setState(() {
        _doctors = list;
        _loading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load doctors. (${e.message})';
        _loading = false;
      });
    }
  }

  List<Doctor> get _visible {
    final q = _query.text.trim().toLowerCase();
    if (q.isEmpty) return _doctors;
    return _doctors
        .where((d) =>
            d.displayName.toLowerCase().contains(q) ||
            d.specialtyLine.toLowerCase().contains(q))
        .toList();
  }

  Future<void> _open(Doctor d) async {
    final booked = await Navigator.of(context).push<bool>(MaterialPageRoute(
      builder: (_) => DoctorDetailScreen(doctorId: d.id),
    ));
    if (booked == true) widget.onBooked();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Find a doctor')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search),
                hintText: 'Search by name or specialty',
                isDense: true,
              ),
            ),
          ),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return ErrorRetry(message: _error!, onRetry: _load);
    final items = _visible;
    if (items.isEmpty) {
      return const EmptyState(
          icon: Icons.person_search, title: 'No doctors found');
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _card(items[i]),
      ),
    );
  }

  Widget _card(Doctor d) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () => _open(d),
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              CircleAvatar(
                radius: 24,
                backgroundColor: Palette.primaryTint,
                child: Text(
                  _initials(d),
                  style: const TextStyle(
                      color: Palette.primary, fontWeight: FontWeight.w700),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(d.displayName,
                              style: const TextStyle(
                                  fontSize: 15, fontWeight: FontWeight.w700)),
                        ),
                        if (d.verified)
                          const Padding(
                            padding: EdgeInsets.only(left: 6),
                            child: Icon(Icons.verified,
                                size: 16, color: Palette.info),
                          ),
                      ],
                    ),
                    if (d.specialtyLine.isNotEmpty)
                      Text(d.specialtyLine,
                          style: const TextStyle(
                              color: Palette.muted, fontSize: 13)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star, size: 14, color: Palette.warning),
                        const SizedBox(width: 2),
                        Text(
                          d.ratingCount == 0
                              ? 'New'
                              : '${d.ratingAverage.toStringAsFixed(1)} (${d.ratingCount})',
                          style: const TextStyle(fontSize: 12),
                        ),
                        const Spacer(),
                        if (d.consultationFee > 0)
                          Text(
                            '${d.consultationFee.toStringAsFixed(0)} ${d.currency}',
                            style: const TextStyle(
                                fontSize: 13, fontWeight: FontWeight.w700),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: Palette.muted),
            ],
          ),
        ),
      ),
    );
  }

  String _initials(Doctor d) {
    final f = (d.firstName ?? '').isNotEmpty ? d.firstName![0] : '';
    final l = (d.lastName ?? '').isNotEmpty ? d.lastName![0] : '';
    final s = (f + l).toUpperCase();
    return s.isEmpty ? 'Dr' : s;
  }
}
