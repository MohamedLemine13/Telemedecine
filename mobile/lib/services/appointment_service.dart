import '../core/api_client.dart';
import '../core/models.dart';

class AppointmentService {
  AppointmentService(this._api);
  final ApiClient _api;

  Future<List<Appointment>> list({int size = 100}) async {
    final res = await _api.dio.get('/api/appointments', queryParameters: {'size': size});
    return pageContent(res.data as Map<String, dynamic>, Appointment.fromJson);
  }

  Future<Appointment> book({
    required String doctorId,
    required DateTime startAt,
    String mode = 'VIDEO',
    String? reason,
  }) async {
    final res = await _api.dio.post('/api/appointments', data: {
      'doctorId': doctorId,
      'startAt': startAt.toUtc().toIso8601String(),
      'mode': mode,
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
    return Appointment.fromJson(res.data as Map<String, dynamic>);
  }

  Future<void> cancel(String id, {String? reason}) async {
    await _api.dio.post('/api/appointments/$id/cancel', data: {
      if (reason != null && reason.isNotEmpty) 'reason': reason,
    });
  }
}
