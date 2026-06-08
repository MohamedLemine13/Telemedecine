import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../services/appointment_service.dart';
import '../consultation/consultation_screen.dart';
import '../theme.dart';
import '../widgets/common.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => AppointmentsScreenState();
}

class AppointmentsScreenState extends State<AppointmentsScreen> {
  bool _loading = true;
  String? _error;
  List<Appointment> _all = const [];
  int _tab = 0;

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    setState(() { _loading = true; _error = null; });
    try {
      final list = await context.read<AppointmentService>().list();
      list.sort((a, b) => b.startAt.compareTo(a.startAt));
      if (!mounted) return;
      setState(() { _all = list; _loading = false; });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load your appointments.\n${e.message}';
        _loading = false;
      });
    }
  }

  List<Appointment> get _visible => switch (_tab) {
        1 => _all.where((a) => a.status == 'COMPLETED' || (a.isScheduled && !a.isFuture)).toList(),
        2 => _all.where((a) => a.status == 'CANCELLED').toList(),
        _ => _all.where((a) => a.isScheduled && a.isFuture).toList()
          ..sort((a, b) => a.startAt.compareTo(b.startAt)),
      };

  Future<void> _cancel(Appointment a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Cancel appointment?', style: TextStyle(fontWeight: FontWeight.w700)),
        content: Text('${fmtDateTime(a.startAt)} with ${a.doctor.label}'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Keep')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: FilledButton.styleFrom(backgroundColor: Palette.error),
            child: const Text('Cancel it'),
          ),
        ],
      ),
    );
    if (ok != true) return;
    final svc = context.read<AppointmentService>();
    try {
      await svc.cancel(a.id);
      if (mounted) toast(context, 'Appointment cancelled.');
      refresh();
    } on DioException catch (e) {
      if (mounted) toast(context, 'Could not cancel. ${e.message}', error: true);
    }
  }

  Future<void> _join(Appointment a) async {
    await Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => ConsultationScreen(appointment: a),
    ));
    refresh();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Appointments'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: refresh,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: Column(
        children: [
          _tabs(),
          Expanded(child: _body()),
        ],
      ),
    );
  }

  Widget _tabs() {
    const labels = ['Upcoming', 'Past', 'Cancelled'];
    final counts = [
      _all.where((a) => a.isScheduled && a.isFuture).length,
      _all.where((a) => a.status == 'COMPLETED' || (a.isScheduled && !a.isFuture)).length,
      _all.where((a) => a.status == 'CANCELLED').length,
    ];
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
      child: Row(
        children: List.generate(labels.length, (i) {
          final active = _tab == i;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: FilterChip(
              label: Text('${labels[i]}${counts[i] > 0 ? " (${counts[i]})" : ""}'),
              selected: active,
              onSelected: (_) => setState(() => _tab = i),
              selectedColor: Palette.primaryTint,
              checkmarkColor: Palette.primary,
              labelStyle: TextStyle(
                color: active ? Palette.primary : Palette.muted,
                fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                fontSize: 13,
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _body() {
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null) return ErrorRetry(message: _error!, onRetry: refresh);
    final items = _visible;
    if (items.isEmpty) {
      return EmptyState(
        icon: _tab == 0 ? Icons.event_available_outlined : Icons.event_busy_outlined,
        title: _tab == 0 ? 'No upcoming appointments' : 'Nothing here',
        subtitle: _tab == 0 ? 'Book a consultation from the "Doctors" tab.' : null,
      );
    }
    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 12),
        itemBuilder: (_, i) => _card(items[i]),
      ),
    );
  }

  Widget _card(Appointment a) {
    final canJoin = a.isScheduled && a.isFuture;
    final isVideo = a.mode == 'VIDEO';
    return Card(
      child: Column(
        children: [
          // Header strip
          Container(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
            decoration: BoxDecoration(
              color: canJoin ? const Color(0xFFEEF4FF) : Colors.white,
              borderRadius: const BorderRadius.vertical(top: Radius.circular(14)),
            ),
            child: Row(
              children: [
                // Doctor avatar
                Container(
                  width: 44,
                  height: 44,
                  decoration: BoxDecoration(
                    gradient: canJoin
                        ? Palette.primaryGradient
                        : const LinearGradient(colors: [Color(0xFFCBD5E1), Color(0xFF94A3B8)]),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Center(
                    child: Text(
                      _initials(a.doctor.label),
                      style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.w700,
                          fontSize: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(a.doctor.label,
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700, color: Palette.ink)),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Icon(
                            isVideo ? Icons.videocam_outlined : Icons.phone_outlined,
                            size: 13,
                            color: Palette.muted,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            isVideo ? 'Video call' : 'Phone call',
                            style: const TextStyle(color: Palette.muted, fontSize: 12),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                StatusBadge(a.status),
              ],
            ),
          ),

          // Time row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                const Icon(Icons.access_time_outlined, size: 15, color: Palette.muted),
                const SizedBox(width: 6),
                Text(fmtDateTime(a.startAt),
                    style: const TextStyle(color: Palette.ink, fontSize: 13)),
                const Spacer(),
                Text(
                  _duration(a),
                  style: const TextStyle(color: Palette.muted, fontSize: 12),
                ),
              ],
            ),
          ),

          if (a.reason != null && a.reason!.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.notes_outlined, size: 15, color: Palette.muted),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(a.reason!,
                        style: const TextStyle(color: Palette.muted, fontSize: 13)),
                  ),
                ],
              ),
            ),
          ],

          if (canJoin) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
              child: Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _join(a),
                      icon: Icon(
                        isVideo ? Icons.videocam : Icons.phone,
                        size: 18,
                      ),
                      label: Text(isVideo ? 'Join video call' : 'Join call'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(44),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: () => _cancel(a),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Palette.error,
                      side: const BorderSide(color: Color(0xFFFFCDD2)),
                      minimumSize: const Size(80, 44),
                    ),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  String _initials(String name) {
    final parts = name.trim().split(' ').where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts.last[0]).toUpperCase();
  }

  String _duration(Appointment a) {
    final mins = a.endAt.difference(a.startAt).inMinutes;
    return mins < 60 ? '${mins}min' : '${(mins / 60).toStringAsFixed(0)}h';
  }
}
