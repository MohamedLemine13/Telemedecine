/// Plain data models mirroring the backend DTOs. Field names match the JSON
/// emitted by the Spring controllers exactly; see the corresponding *Dto.java.
library;

class TokenPair {
  final String accessToken;
  final String refreshToken;
  final int accessExpiresIn;

  TokenPair({
    required this.accessToken,
    required this.refreshToken,
    required this.accessExpiresIn,
  });

  factory TokenPair.fromJson(Map<String, dynamic> j) => TokenPair(
        accessToken: j['accessToken'] as String,
        refreshToken: j['refreshToken'] as String,
        accessExpiresIn: (j['accessExpiresIn'] as num?)?.toInt() ?? 0,
      );
}

/// /login response: either `tokens` (full login) or `tfa` (2FA challenge).
class LoginResult {
  final TokenPair? tokens;
  final String? tfaChallengeToken;

  LoginResult({this.tokens, this.tfaChallengeToken});

  bool get tfaRequired => tfaChallengeToken != null;

  factory LoginResult.fromJson(Map<String, dynamic> j) {
    final tokens = j['tokens'];
    final tfa = j['tfa'];
    return LoginResult(
      tokens: tokens == null
          ? null
          : TokenPair.fromJson(tokens as Map<String, dynamic>),
      tfaChallengeToken:
          tfa == null ? null : (tfa as Map<String, dynamic>)['challengeToken'] as String?,
    );
  }
}

class Specialty {
  final String id;
  final String code;
  final String labelFr;
  final String labelEn;

  Specialty({
    required this.id,
    required this.code,
    required this.labelFr,
    required this.labelEn,
  });

  String get label => labelFr.isNotEmpty ? labelFr : labelEn;

  factory Specialty.fromJson(Map<String, dynamic> j) => Specialty(
        id: j['id'] as String,
        code: (j['code'] ?? '') as String,
        labelFr: (j['labelFr'] ?? '') as String,
        labelEn: (j['labelEn'] ?? '') as String,
      );
}

class Doctor {
  final String id;
  final String? firstName;
  final String? lastName;
  final String? title;
  final String? bio;
  final double consultationFee;
  final String currency;
  final double ratingAverage;
  final int ratingCount;
  final bool verified;
  final List<Specialty> specialties;
  final List<String> languages;

  Doctor({
    required this.id,
    this.firstName,
    this.lastName,
    this.title,
    this.bio,
    required this.consultationFee,
    required this.currency,
    required this.ratingAverage,
    required this.ratingCount,
    required this.verified,
    required this.specialties,
    required this.languages,
  });

  String get displayName {
    final parts = <String>[
      if ((title ?? '').isNotEmpty) title!,
      if ((firstName ?? '').isNotEmpty) firstName!,
      if ((lastName ?? '').isNotEmpty) lastName!,
    ];
    return parts.isEmpty ? 'Doctor' : parts.join(' ');
  }

  String get specialtyLine =>
      specialties.isEmpty ? '' : specialties.map((s) => s.label).join(', ');

  factory Doctor.fromJson(Map<String, dynamic> j) => Doctor(
        id: j['id'] as String,
        firstName: j['firstName'] as String?,
        lastName: j['lastName'] as String?,
        title: j['title'] as String?,
        bio: j['bio'] as String?,
        consultationFee:
            (j['consultationFee'] as num?)?.toDouble() ?? 0,
        currency: (j['currency'] ?? '') as String,
        ratingAverage: (j['ratingAverage'] as num?)?.toDouble() ?? 0,
        ratingCount: (j['ratingCount'] as num?)?.toInt() ?? 0,
        verified: (j['verified'] as bool?) ?? false,
        specialties: ((j['specialties'] as List?) ?? const [])
            .map((e) => Specialty.fromJson(e as Map<String, dynamic>))
            .toList(),
        languages: ((j['languages'] as List?) ?? const [])
            .map((e) => e as String)
            .toList(),
      );
}

class Slot {
  final DateTime startAt;
  final DateTime endAt;

  Slot({required this.startAt, required this.endAt});

  factory Slot.fromJson(Map<String, dynamic> j) => Slot(
        startAt: DateTime.parse(j['startAt'] as String),
        endAt: DateTime.parse(j['endAt'] as String),
      );
}

class Party {
  final String id;
  final String? name;
  final String? email;

  Party({required this.id, this.name, this.email});

  String get label => (name?.isNotEmpty ?? false) ? name! : (email ?? '—');

  factory Party.fromJson(Map<String, dynamic> j) => Party(
        id: j['id'] as String,
        name: j['name'] as String?,
        email: j['email'] as String?,
      );
}

class Appointment {
  final String id;
  final String status; // SCHEDULED / CANCELLED / COMPLETED
  final String mode; // VIDEO / PHONE
  final DateTime startAt;
  final DateTime endAt;
  final String? reason;
  final String? cancelReason;
  final Party doctor;
  final Party patient;

  Appointment({
    required this.id,
    required this.status,
    required this.mode,
    required this.startAt,
    required this.endAt,
    this.reason,
    this.cancelReason,
    required this.doctor,
    required this.patient,
  });

  bool get isScheduled => status == 'SCHEDULED';
  bool get isFuture => startAt.isAfter(DateTime.now());

  factory Appointment.fromJson(Map<String, dynamic> j) => Appointment(
        id: j['id'] as String,
        status: j['status'] as String,
        mode: j['mode'] as String,
        startAt: DateTime.parse(j['startAt'] as String),
        endAt: DateTime.parse(j['endAt'] as String),
        reason: j['reason'] as String?,
        cancelReason: j['cancelReason'] as String?,
        doctor: Party.fromJson(j['doctor'] as Map<String, dynamic>),
        patient: Party.fromJson(j['patient'] as Map<String, dynamic>),
      );
}

/// Everything needed to connect to a LiveKit room for a consultation.
class JoinInfo {
  final String consultationId;
  final String appointmentId;
  final String roomName;
  final String livekitUrl;
  final String token;
  final String identity;
  final String role; // PATIENT / DOCTOR
  final String selfName;
  final String counterpartName;
  final String mode; // VIDEO / PHONE

  JoinInfo({
    required this.consultationId,
    required this.appointmentId,
    required this.roomName,
    required this.livekitUrl,
    required this.token,
    required this.identity,
    required this.role,
    required this.selfName,
    required this.counterpartName,
    required this.mode,
  });

  bool get isVideo => mode == 'VIDEO';

  factory JoinInfo.fromJson(Map<String, dynamic> j) => JoinInfo(
        consultationId: j['consultationId'] as String,
        appointmentId: j['appointmentId'] as String,
        roomName: j['roomName'] as String,
        livekitUrl: j['livekitUrl'] as String,
        token: j['token'] as String,
        identity: j['identity'] as String,
        role: j['role'] as String,
        selfName: (j['selfName'] ?? '') as String,
        counterpartName: (j['counterpartName'] ?? '') as String,
        mode: j['mode'] as String,
      );
}

class ChatMessage {
  final String id;
  final String senderAccountId;
  final String senderName;
  final String senderRole;
  final String body;
  final DateTime sentAt;

  ChatMessage({
    required this.id,
    required this.senderAccountId,
    required this.senderName,
    required this.senderRole,
    required this.body,
    required this.sentAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> j) => ChatMessage(
        id: j['id'] as String,
        senderAccountId: j['senderAccountId'] as String,
        senderName: (j['senderName'] ?? '') as String,
        senderRole: (j['senderRole'] ?? '') as String,
        body: j['body'] as String,
        sentAt: DateTime.parse(j['sentAt'] as String),
      );
}

class PatientProfile {
  final String id;
  final String email;
  final String? firstName;
  final String? lastName;

  PatientProfile({
    required this.id,
    required this.email,
    this.firstName,
    this.lastName,
  });

  String get displayName {
    final parts = <String>[
      if ((firstName ?? '').isNotEmpty) firstName!,
      if ((lastName ?? '').isNotEmpty) lastName!,
    ];
    return parts.isEmpty ? email : parts.join(' ');
  }

  factory PatientProfile.fromJson(Map<String, dynamic> j) => PatientProfile(
        id: j['id'] as String,
        email: (j['email'] ?? '') as String,
        firstName: j['firstName'] as String?,
        lastName: j['lastName'] as String?,
      );
}

/// Generic Spring `Page<T>` wrapper — we only need `content`.
List<T> pageContent<T>(
  Map<String, dynamic> json,
  T Function(Map<String, dynamic>) item,
) {
  final content = (json['content'] as List?) ?? const [];
  return content.map((e) => item(e as Map<String, dynamic>)).toList();
}
