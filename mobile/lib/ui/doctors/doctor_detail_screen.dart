import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/models.dart';
import '../../services/appointment_service.dart';
import '../../services/doctor_service.dart';
import '../theme.dart';
import '../widgets/common.dart';

class DoctorDetailScreen extends StatefulWidget {
  const DoctorDetailScreen({super.key, required this.doctorId});
  final String doctorId;

  @override
  State<DoctorDetailScreen> createState() => _DoctorDetailScreenState();
}

class _DoctorDetailScreenState extends State<DoctorDetailScreen> {
  bool _loading = true;
  String? _error;
  Doctor? _doctor;
  List<Slot> _slots = const [];
  Slot? _selected;
  String _mode = 'VIDEO';
  final _reason = TextEditingController();
  bool _booking = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _reason.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final svc = context.read<DoctorService>();
      final doctor = await svc.getById(widget.doctorId);
      final slots = await svc.slots(widget.doctorId);
      slots.sort((a, b) => a.startAt.compareTo(b.startAt));
      if (!mounted) return;
      setState(() {
        _doctor = doctor;
        _slots = slots;
        _loading = false;
      });
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Could not load this doctor. (${e.message})';
        _loading = false;
      });
    }
  }

  Future<void> _book() async {
    final slot = _selected;
    if (slot == null) return;
    setState(() => _booking = true);
    try {
      await context.read<AppointmentService>().book(
            doctorId: widget.doctorId,
            startAt: slot.startAt,
            mode: _mode,
            reason: _reason.text.trim(),
          );
      if (!mounted) return;
      toast(context, 'Appointment booked.');
      Navigator.of(context).pop(true);
    } on DioException catch (e) {
      if (!mounted) return;
      setState(() => _booking = false);
      final detail = e.response?.data is Map
          ? (e.response!.data as Map)['detail'] as String?
          : null;
      toast(context, detail ?? 'Could not book that slot. Try another.',
          error: true);
    }
  }

  /// Group slots by calendar day (UTC) for a tidy picker.
  Map<String, List<Slot>> get _byDay {
    final map = <String, List<Slot>>{};
    for (final s in _slots) {
      final key = fmtDay(s.startAt);
      (map[key] ??= []).add(s);
    }
    return map;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Doctor')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorRetry(message: _error!, onRetry: _load)
              : _content(),
      bottomNavigationBar: (_loading || _error != null) ? null : _bookBar(),
    );
  }

  Widget _content() {
    final d = _doctor!;
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: Palette.primaryTint,
              child: const Icon(Icons.person, color: Palette.primary, size: 32),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(d.displayName,
                      style: const TextStyle(
                          fontSize: 18, fontWeight: FontWeight.w800)),
                  if (d.specialtyLine.isNotEmpty)
                    Text(d.specialtyLine,
                        style: const TextStyle(color: Palette.muted)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 15, color: Palette.warning),
                      const SizedBox(width: 3),
                      Text(d.ratingCount == 0
                          ? 'No ratings yet'
                          : '${d.ratingAverage.toStringAsFixed(1)} · ${d.ratingCount} reviews'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        if ((d.bio ?? '').isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(d.bio!, style: const TextStyle(height: 1.5)),
        ],
        if (d.languages.isNotEmpty) ...[
          const SizedBox(height: 12),
          Wrap(
            spacing: 6,
            children: d.languages
                .map((l) => Chip(
                      label: Text(l),
                      visualDensity: VisualDensity.compact,
                    ))
                .toList(),
          ),
        ],
        const Divider(height: 32),
        const Text('Pick a time',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 12),
        if (_slots.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 20),
            child: Text('No open slots right now. Check back later.',
                style: TextStyle(color: Palette.muted)),
          )
        else
          ..._byDay.entries.map(_daySection),
        const SizedBox(height: 16),
        const Text('Mode', style: TextStyle(fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        Row(
          children: [
            _modeChip('VIDEO', 'Video', Icons.videocam),
            const SizedBox(width: 8),
            _modeChip('PHONE', 'Phone', Icons.call),
          ],
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _reason,
          maxLines: 2,
          maxLength: 500,
          decoration: const InputDecoration(
            labelText: 'Reason (optional)',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _daySection(MapEntry<String, List<Slot>> e) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Text(e.key,
              style: const TextStyle(
                  fontWeight: FontWeight.w600, color: Palette.muted)),
        ),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: e.value.map((s) {
            final active = _selected?.startAt == s.startAt;
            return ChoiceChip(
              label: Text(fmtTime(s.startAt)),
              selected: active,
              onSelected: (_) => setState(() => _selected = s),
              selectedColor: Palette.primary,
              labelStyle: TextStyle(
                color: active ? Colors.white : Palette.ink,
                fontWeight: FontWeight.w600,
              ),
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _modeChip(String value, String label, IconData icon) {
    final active = _mode == value;
    return ChoiceChip(
      avatar: Icon(icon,
          size: 16, color: active ? Colors.white : Palette.ink),
      label: Text(label),
      selected: active,
      onSelected: (_) => setState(() => _mode = value),
      selectedColor: Palette.primary,
      labelStyle: TextStyle(
        color: active ? Colors.white : Palette.ink,
        fontWeight: FontWeight.w600,
      ),
    );
  }

  Widget _bookBar() {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
        child: FilledButton(
          onPressed: (_selected == null || _booking) ? null : _book,
          child: _booking
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                      strokeWidth: 2, color: Colors.white))
              : Text(_selected == null
                  ? 'Select a time to book'
                  : 'Book ${fmtDateTime(_selected!.startAt)}'),
        ),
      ),
    );
  }
}
