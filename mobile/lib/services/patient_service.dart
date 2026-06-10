import 'package:dio/dio.dart';

import '../core/api_client.dart';
import '../core/models.dart';

class PatientService {
  PatientService(this._api);
  final ApiClient _api;

  Future<PatientProfile> me() async {
    final res = await _api.dio.get('/api/patients/me');
    return PatientProfile.fromJson(res.data as Map<String, dynamic>);
  }

  /// The patient's prescriptions (GET /api/prescriptions, role-aware on the
  /// backend). Tolerates transient failures by returning an empty list so the
  /// screen shows a friendly empty state instead of an error.
  Future<List<Map<String, dynamic>>> prescriptions() async {
    try {
      final res = await _api.dio.get('/api/prescriptions');
      final data = res.data;
      if (data is List) return data.cast<Map<String, dynamic>>();
      if (data is Map && data['content'] is List) {
        return (data['content'] as List).cast<Map<String, dynamic>>();
      }
      return const [];
    } on DioException {
      return const [];
    }
  }
}
