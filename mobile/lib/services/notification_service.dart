import 'package:dio/dio.dart';

import '../core/api_client.dart';

/// One in-app notification (the mobile equivalent of a push alert): appointment
/// confirmations, new doctor messages, billing updates and health alerts.
class AppNotification {
  final String id;
  final String type;
  final String title;
  final String? body;
  final String? link;
  final bool read;
  final DateTime createdAt;

  AppNotification({
    required this.id,
    required this.type,
    required this.title,
    this.body,
    this.link,
    required this.read,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> j) => AppNotification(
        id: j['id'] as String,
        type: (j['type'] ?? '') as String,
        title: (j['title'] ?? '') as String,
        body: j['body'] as String?,
        link: j['link'] as String?,
        read: (j['read'] as bool?) ?? false,
        createdAt: DateTime.tryParse((j['createdAt'] ?? '') as String) ??
            DateTime.now(),
      );
}

/// Reads the persisted notification feed. Polled by the Alerts screen; the same
/// backend events are also mirrored to the user's email. Tolerates the endpoint
/// being unavailable by returning empty results instead of throwing.
class NotificationService {
  NotificationService(this._api);
  final ApiClient _api;

  Future<List<AppNotification>> list({int page = 0, int size = 50}) async {
    try {
      final res = await _api.dio.get('/api/notifications',
          queryParameters: {'page': page, 'size': size});
      final data = res.data;
      final content = data is Map && data['content'] is List
          ? data['content'] as List
          : (data is List ? data : const []);
      return content
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException {
      return const [];
    }
  }

  Future<int> unreadCount() async {
    try {
      final res = await _api.dio.get('/api/notifications/unread-count');
      final data = res.data;
      if (data is Map && data['count'] != null) {
        return (data['count'] as num).toInt();
      }
      return 0;
    } on DioException {
      return 0;
    }
  }

  Future<void> markRead(String id) async {
    try {
      await _api.dio.post('/api/notifications/$id/read');
    } on DioException {
      /* best-effort */
    }
  }

  Future<void> markAllRead() async {
    try {
      await _api.dio.post('/api/notifications/read-all');
    } on DioException {
      /* best-effort */
    }
  }
}
