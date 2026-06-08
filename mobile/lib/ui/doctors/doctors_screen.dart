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
    setState(() { _loading = true; _error = null; });
    try {
      final list = await context.read<DoctorService>().search();
      if (!mounted) return;
      setState(() { _doctors = list; _loading = false; });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() { _error = 'Could not load doctors. ${e.message}'; _loading = false; });
    }
  }

  List<Doctor> get _visible {
    final q = _query.text.trim().toLowerCase();
    if (q.isEmpty) return _doctors;
    return _doctors.where((d) =>
        d.displayName.toLowerCase().contains(q) ||
        d.specialtyLine.toLowerCase().contains(q)).toList();
  }

  Future<void> _open(Doctor d) async {
    final booked = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => DoctorDetailScreen(doctorId: d.id)),
    );
    if (booked == true) widget.onBooked();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Find a Doctor')),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: TextField(
              controller: _query,
              onChanged: (_) => setState(() {}),
              decoration: const InputDecoration(
                prefixIcon: Icon(Icons.search, size: 20),
                hintText: 'Search by name or specialty…',
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
        icon: Icons.person_search_outlined,
        title: 'No doctors found',
        subtitle: 'Try a different name or specialty.',
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _card(items[i]),
      ),
    );
  }

  Widget _card(Doctor d) {
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _open(d),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              // Avatar with gradient
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  gradient: d.verified
                      ? Palette.primaryGradient
                      : const LinearGradient(
                          colors: [Color(0xFF64748B), Color(0xFF94A3B8)]),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    _initials(d),
                    style: const TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                        fontSize: 16),
                  ),
                ),
              ),
              const SizedBox(width: 14),
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
                        if (d.verified) ...[
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFE8F5E9),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified, size: 11,
                                    color: Color(0xFF2E7D32)),
                                SizedBox(width: 2),
                                Text('Verified',
                                    style: TextStyle(
                                        fontSize: 10,
                                        color: Color(0xFF2E7D32),
                                        fontWeight: FontWeight.w700)),
                              ],
                            ),
                          ),
                        ],
                      ],
                    ),
                    if (d.specialtyLine.isNotEmpty) ...[
                      const SizedBox(height: 3),
                      Text(d.specialtyLine,
                          style: const TextStyle(
                              color: Palette.muted, fontSize: 13)),
                    ],
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded,
                            size: 15, color: Palette.warning),
                        const SizedBox(width: 3),
                        Text(
                          d.ratingCount == 0
                              ? 'New'
                              : '${d.ratingAverage.toStringAsFixed(1)} · ${d.ratingCount} reviews',
                          style: const TextStyle(
                              fontSize: 12, color: Palette.muted),
                        ),
                        const Spacer(),
                        if (d.consultationFee > 0)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: Palette.primaryTint,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${d.consultationFee.toStringAsFixed(0)} ${d.currency}',
                              style: const TextStyle(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: Palette.primary),
                            ),
                          ),
                      ],
                    ),
                    if (d.languages.isNotEmpty) ...[
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 4,
                        children: d.languages.take(3).map((l) => Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF1F5F9),
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(l,
                              style: const TextStyle(
                                  fontSize: 11, color: Palette.muted)),
                        )).toList(),
                      ),
                    ],
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
    return (f + l).toUpperCase().isNotEmpty ? (f + l).toUpperCase() : 'Dr';
  }
}
