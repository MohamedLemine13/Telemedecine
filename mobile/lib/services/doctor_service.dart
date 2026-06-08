import '../core/api_client.dart';
import '../core/models.dart';

class DoctorService {
  DoctorService(this._api);
  final ApiClient _api;

  Future<List<Doctor>> search({String? specialty, int size = 50}) async {
    final res = await _api.dio.get('/api/doctors', queryParameters: {
      if (specialty != null && specialty.isNotEmpty) 'specialty': specialty,
      'size': size,
    });
    return pageContent(res.data as Map<String, dynamic>, Doctor.fromJson);
  }

  Future<Doctor> getById(String id) async {
    final res = await _api.dio.get('/api/doctors/$id');
    return Doctor.fromJson(res.data as Map<String, dynamic>);
  }

  Future<List<Specialty>> specialties() async {
    final res = await _api.dio.get('/api/doctors/specialties');
    return ((res.data as List?) ?? const [])
        .map((e) => Specialty.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<List<Slot>> slots(String doctorId) async {
    final res = await _api.dio.get('/api/doctors/$doctorId/slots');
    return ((res.data as List?) ?? const [])
        .map((e) => Slot.fromJson(e as Map<String, dynamic>))
        .toList();
  }
}
