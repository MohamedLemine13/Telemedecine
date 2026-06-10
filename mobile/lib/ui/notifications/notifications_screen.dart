import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../services/notification_service.dart';
import '../theme.dart';
import '../widgets/common.dart';

/// Alerts feed — appointment confirmations, doctor messages, billing and health
/// alerts. This is the in-app stand-in for push notifications; pull-to-refresh
/// re-fetches and tapping an item marks it read.
class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  bool _loading = true;
  List<AppNotification> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final items = await context.read<NotificationService>().list();
    if (!mounted) return;
    setState(() {
      _items = items;
      _loading = false;
    });
  }

  Future<void> _markAll() async {
    await context.read<NotificationService>().markAllRead();
    await _load();
  }

  Future<void> _tap(AppNotification n) async {
    if (!n.read) {
      await context.read<NotificationService>().markRead(n.id);
      await _load();
    }
  }

  IconData _iconFor(String type) {
    switch (type) {
      case 'APPOINTMENT_BOOKED':
      case 'APPOINTMENT_RESCHEDULED':
        return Icons.event_available;
      case 'APPOINTMENT_CANCELLED':
        return Icons.event_busy;
      case 'NEW_CHAT_MESSAGE':
        return Icons.chat_bubble_outline;
      case 'INVOICE_PAID':
        return Icons.receipt_long;
      case 'ADMIN_MESSAGE':
        return Icons.campaign_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasUnread = _items.any((n) => !n.read);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Alerts'),
        actions: [
          if (hasUnread)
            TextButton(onPressed: _markAll, child: const Text('Mark all read')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: _items.isEmpty
                  ? ListView(
                      children: const [
                        SizedBox(height: 80),
                        EmptyState(
                          icon: Icons.notifications_none,
                          title: 'No alerts yet',
                          subtitle:
                              'Appointment confirmations, messages from your '
                              'doctor and health alerts will show up here.',
                        ),
                      ],
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: _items.length,
                      itemBuilder: (_, i) {
                        final n = _items[i];
                        return Card(
                          color: n.read ? null : Palette.primaryTint,
                          child: ListTile(
                            leading: Icon(_iconFor(n.type), color: Palette.primary),
                            title: Text(n.title,
                                style: TextStyle(
                                    fontWeight: n.read
                                        ? FontWeight.w500
                                        : FontWeight.w700)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if ((n.body ?? '').isNotEmpty) Text(n.body!),
                                const SizedBox(height: 2),
                                Text(
                                  DateFormat('d MMM, HH:mm').format(n.createdAt.toLocal()),
                                  style: const TextStyle(
                                      fontSize: 11, color: Palette.muted),
                                ),
                              ],
                            ),
                            onTap: () => _tap(n),
                          ),
                        );
                      },
                    ),
            ),
    );
  }
}
