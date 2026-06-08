import '../core/api_client.dart';
import '../core/models.dart';

class ConsultationService {
  ConsultationService(this._api);
  final ApiClient _api;

  /// Open (or create) the consultation for an appointment and get a LiveKit token.
  Future<JoinInfo> join(String appointmentId) async {
    final res = await _api.dio.post('/api/consultations/$appointmentId/join');
    return JoinInfo.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> end(String consultationId) async {
    await _api.dio.post('/api/consultations/$consultationId/end');
  }

  Future<List<ChatMessage>> messages(String consultationId) async {
    final res = await _api.dio.get('/api/consultations/$consultationId/messages');
    return ((res.data as List?) ?? const [])
        .map((e) => ChatMessage.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<ChatMessage> send(String consultationId, String body) async {
    final res = await _api.dio.post(
      '/api/consultations/$consultationId/messages',
      data: {'body': body},
    );
    return ChatMessage.fromJson(res.data as Map<String, dynamic>);
  }
}
