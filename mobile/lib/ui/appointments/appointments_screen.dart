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
  int _tab = 0; // 0 upcoming, 1 past, 2 cancelled

  @override
  void initState() {
    super.initState();
    refresh();
  }

  Future<void> refresh() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await context.read<AppointmentService>().list();
      list.sort((a, b) => b.startAt.compareTo(a.startAt));
      if (!mounted) return;
      setState(() {
        _all = list;
        _loading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load your appointments. (${e.message})';
        _loading = false;
      });
    }
  }

  List<Appointment> get _visible {
    switch (_tab) {
      case 1:
        return _all
            .where((a) =>
                a.status == 'COMPLETED' || (a.isScheduled && !a.isFuture))
            .toList();
      case 2:
        return _all.where((a) => a.status == 'CANCELLED').toList();
      default:
        return _all.where((a) => a.isScheduled && a.isFuture).toList()
          ..sort((a, b) => a.startAt.compareTo(b.startAt));
    }
  }

  Future<void> _cancel(Appointment a) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel appointment?'),
        content: Text('${fmtDateTime(a.startAt)} with ${a.doctor.label}'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep')),
          FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Cancel it')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await context.read<AppointmentService>().cancel(a.id);
      if (mounted) toast(context, 'Appointment cancelled.');
      refresh();
    } on DioException catch (e) {
      if (mounted) toast(context, 'Could not cancel. (${e.message})', error: true);
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
      appBar: AppBar(title: const Text('My appointments')),
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
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
      child: Row(
        children: List.generate(labels.length, (i) {
          final active = _tab == i;
          return Padding(
            padding: const EdgeInsets.only(right: 8),
            child: ChoiceChip(
              label: Text(labels[i]),
              selected: active,
              onSelected: (_) => setState(() => _tab = i),
              selectedColor: Palette.primaryTint,
              labelStyle: TextStyle(
                color: active ? Palette.primary : Palette.ink,
                fontWeight: FontWeight.w600,
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _body() {
    if (_loading) return const Center(child: CircularProgressIndicator());
    if (_error != null) return ErrorRetry(message: _error!, onRetry: refresh);
    final items = _visible;
    if (items.isEmpty) {
      return const EmptyState(
        icon: Icons.event_busy,
        title: 'Nothing here',
        subtitle: 'Book a consultation from the "Find a doctor" tab.',
      );
    }
    return RefreshIndicator(
      onRefresh: refresh,
      child: ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (_, i) => _card(items[i]),
      ),
    );
  }

  Widget _card(Appointment a) {
    final canJoin = a.isScheduled && a.isFuture;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(a.doctor.label,
                          style: const TextStyle(
                              fontSize: 15, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 2),
                      Text('${fmtDateTime(a.startAt)} · ${toTitle(a.mode)}',
                          style: const TextStyle(
                              color: Palette.muted, fontSize: 13)),
                    ],
                  ),
                ),
                StatusBadge(a.status),
              ],
            ),
            if (a.reason != null && a.reason!.isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('“${a.reason}”',
                  style: const TextStyle(color: Palette.muted, fontSize: 13)),
            ],
            if (a.status == 'CANCELLED' && (a.cancelReason ?? '').isNotEmpty) ...[
              const SizedBox(height: 6),
              Text('Cancelled: ${a.cancelReason}',
                  style: const TextStyle(color: Palette.error, fontSize: 12)),
            ],
            if (canJoin) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: () => _join(a),
                      icon: const Icon(Icons.videocam, size: 18),
                      label: const Text('Join call'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(42),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  OutlinedButton(
                    onPressed: () => _cancel(a),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Palette.error,
                      minimumSize: const Size.fromHeight(42),
                    ),
                    child: const Text('Cancel'),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
