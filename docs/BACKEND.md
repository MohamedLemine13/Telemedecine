# Backend reference

Spring Boot 3.5 / Java 21 modular monolith under `com.irt42.telemedecine`. Every
module is split into `api` (controllers + DTOs), `application` (services),
`domain` (entities/enums/events), and `infrastructure` (repositories). This file
walks every package and the functions it exposes.

Conventions:
- Controllers resolve the caller from the JWT via `subject(jwt)` →
  `UUID.fromString(jwt.getToken().getSubject())`.
- Errors are thrown as `ResponseStatusException` and rendered as RFC-7807 by
  `GlobalExceptionHandler`.
- All entities extend `BaseEntity` (UUID id, timestamps, `@Version`).

---

## Bootstrap

### `TelemedecineApplication`
Spring Boot entry point (`main`). Enables component scanning for the whole
`com.irt42.telemedecine` tree.

---

## `common` — shared building blocks

| File | Purpose |
|---|---|
| `BaseEntity` | `@MappedSuperclass` with UUID `id`, `createdAt`/`updatedAt` (auditing), and optimistic-lock `version`. Base of every entity. |
| `JpaAuditingConfig` | Enables `@EnableJpaAuditing` so the audit columns populate. |
| `ApiError` | RFC-7807 problem-detail record (type/title/status/detail/instance + field errors). |
| `web/GlobalExceptionHandler` | `@RestControllerAdvice` mapping `ResponseStatusException`, validation errors, and uncaught exceptions to `ApiError` responses. |
| `pdf/PdfDocuments` | OpenPDF wrapper. `document(heading, subheading, List<Meta>, bodyTitle, body, footer)` renders a branded A4 PDF to `byte[]`; nested `record Meta(label, value)` for the key/value table. Used by prescriptions and consultation reports. |

---

## `config` — cross-cutting configuration

| File | Purpose |
|---|---|
| `SecurityConfig` | Builds the `SecurityFilterChain`: stateless JWT resource server, permit-list (auth, swagger, actuator health, `/ws/**`, `/lk/**`), method security, JWT→authorities converter mapping the `roles` claim. |
| `OpenApiConfig` | springdoc OpenAPI metadata + bearer security scheme for Swagger UI. |
| `WebSocketConfig` | `@EnableWebSocket`; registers `ChatSocketHandler` at `/ws/chat` with permissive allowed-origins (auth happens in the handshake). |

---

## `auth` — identity, sessions, 2FA

### api
- **`AuthController`** (`/api/auth`): `signup`, `login` (returns tokens or a TOTP
  challenge), `refresh` (rotate), `logout` (revoke), `2fa/setup`, `2fa/enable`,
  `2fa/verify` (login step-up), `2fa/disable`, `password/change`,
  `password/forgot`, `password/reset`.
- **dto**: `SignupRequest`, `LoginRequest`, `LoginResponse` (tokens | tfa),
  `RefreshRequest`, `TokenResponse`, `TfaChallengeResponse`, `TfaSetupResponse`,
  `TfaVerifyRequest`, `TfaVerifyLoginRequest`, `ChangePasswordRequest`.

### application
- **`AuthService`** — `signup` (creates account + `ROLE_PATIENT`/role, hashes
  password), `login` (verifies password, branches to 2FA challenge or token
  issue), `verifyTfaLogin`, `refresh`, `logout`, `changePassword` (verifies
  current password, re-encodes, `refreshTokens.revokeAll`), `forgot`/`reset`
  password.
- **`JwtService`** — mints access tokens (HS256, `sub`/`email`/`roles`/`tfa_verified`).
- **`JwtProperties`** — bound `telemedecine.jwt.*` (secret, TTLs).
- **`RefreshTokenService`** — `issue`, `rotate`, `revoke`, `revokeAll(account)`
  (wraps `repo.revokeAllActive(account, now)`).
- **`TotpService`** — secret generation, provisioning URI, code verification.
- **`AuthErrors`** — shared exception factories (invalid credentials, etc.).

### domain
`Account`, `AccountStatus` (ACTIVE/SUSPENDED), `Role`, `RoleCode`
(ROLE_PATIENT/DOCTOR/ADMIN), `RefreshToken`, `PasswordResetToken`, `EmailOtp`,
`TotpSecret`.

### infrastructure
`AccountRepository` (incl. `searchForAdmin(q, role, pageable)` coalesce-bind),
`RoleRepository`, `RefreshTokenRepository` (`revokeAllActive`),
`PasswordResetTokenRepository`, `EmailOtpRepository`, `TotpSecretRepository`.

---

## `patient` — profile + medical record

- **`PatientController`** (`/api/patients/me`): `getMine`, `updateMine`, and CRUD
  for `allergies`, `treatments`, `lab-results` (add/delete sub-resources).
- **`PatientService`** — loads/creates the caller's profile, applies profile
  updates, and adds/removes medical-record items scoped to the owner.
- **domain**: `PatientProfile` (1:1 account) with `@OneToMany` `Allergy`,
  `Treatment`, `LabResult`.
- **dto**: `PatientProfileDto`, `UpdatePatientProfileRequest`, `AllergyDto`,
  `TreatmentDto`, `LabResultDto`.
- **`PatientProfileRepository`** — `findByAccountId`.

---

## `doctor` — profile, specialties, credentials

- **`DoctorController`** (`/api/doctors`): public `search`, `getById`,
  `listSpecialties`; authenticated `getMine`, `updateMine`, `uploadCredential`
  (multipart).
- **`DoctorService`** — `search` (rating-sorted page → public view), `getById`
  (verified-only), `getOrCreateMine` (lazily creates the profile row),
  `updateMine`, `listSpecialties`, `uploadCredential` (stores the file, creates a
  PENDING `Credential`, publishes `CredentialUploadedEvent`).
- **domain**: `DoctorProfile` (M:N `Specialty`, 1:N `Credential`, verified flag,
  rating), `Specialty`, `Credential` (Kind/Status).
- **events**: `CredentialUploadedEvent`.
- **infrastructure**: `DoctorProfileRepository` (`search`, `findByAccountId`),
  `SpecialtyRepository`, `CredentialRepository`.

---

## `appointment` — booking + availability

- **`AppointmentController`** (`/api/appointments`): `book` (patient), role-aware
  `list`, `get`, `reschedule`, `cancel`, `complete` (doctor), `myPatients`
  (doctor roster).
- **`AvailabilityController`** (`/api/doctors`): `freeSlots` (`/{id}/slots`),
  `listMine`/`replaceMine` (`/me/availability`).
- **`AppointmentService`** — `book` (validates slot via `requireFreeSlot`,
  auto-creates the patient profile, notifies both parties), `reschedule`,
  `cancel`, `complete`, role-scoped `listForDoctor`/`listForPatient`, `get`,
  `listPatientsForDoctor` (groups appointments into `DoctorPatientDto`),
  `notifyCounterpart` helper.
- **`AvailabilityService`** — `listMine` (empty when no profile yet),
  `replaceMine` (validates each block, rejects overlaps and too-short blocks,
  auto-creates the doctor profile, full-replaces the weekly set), `freeSlots`
  (expands the weekly template into concrete UTC slots minus booked times),
  `requireFreeSlot` (asserts a chosen time is still free/grid-aligned).
- **domain**: `Appointment` (Status SCHEDULED/CANCELLED/COMPLETED, Mode
  VIDEO/PHONE), `DoctorAvailability` (day-of-week, start/end, slot minutes).
- **dto**: `AppointmentDto`, `BookAppointmentRequest`, `RescheduleRequest`,
  `CancelRequest`, `AvailabilityDto`, `SetAvailabilityRequest` (+ `Block`),
  `SlotDto`, `DoctorPatientDto` (+ mutable `Builder`).
- **infrastructure**: `AppointmentRepository` (window/overlap queries,
  status counts, doctor-patient aggregation), `DoctorAvailabilityRepository`.

---

## `consultation` — sessions, chat, notes, reports

- **`ConsultationController`** (`/api/consultations`): `conversations` (`GET ""`),
  `reportPdf` (`/{id}/report.pdf`, doctor), `join` (`/{appointmentId}/join`),
  `end`, `messages`, `send`, `getNote`, `updateNote`.
- **`ConsultationService`** — `join` (creates/loads the consultation, mints a
  LiveKit token, builds `JoinResponse`), `end` (**doctor-only effect**: a patient
  leaving is a no-op so they can rejoin; only the doctor ending closes the
  consultation and marks a still-`SCHEDULED` appointment `COMPLETED`),
  `listMessages`, `sendMessage`
  (persists → `chatSocket.broadcast`; if counterpart offline →
  `NEW_CHAT_MESSAGE` notification), `getNote`/`saveNote` (doctor-only),
  `listConversations` (→ `ConversationDto` list), `reportData` (assembles the
  report), `counterpartAccountId` helper.
- **`LivekitTokenService`** — signs LiveKit JWT access tokens (Nimbus) for a room
  + identity with publish/subscribe grants.
- **domain**: `Consultation` (1:1 appointment, status, timestamps),
  `ChatMessage`, `ClinicalNote`.
- **dto**: `JoinResponse`, `ChatMessageDto`, `SendMessageRequest`,
  `ClinicalNoteDto`, `UpdateNoteRequest`, `ConversationDto`.
- **infrastructure**: `ConsultationRepository` (`findAllForAccount`,
  `isParticipant`, `countByStatus`), `ChatMessageRepository`
  (`findFirst…OrderByCreatedAtDesc`, `countByConsultationId`),
  `ClinicalNoteRepository`, and **`ws/ChatSocketHandler`** — a
  `TextWebSocketHandler` that authenticates the `?token=` on handshake, checks
  participation, keeps a `Map<consultationId, Set<session>>`, exposes
  `broadcast(consultationId, payload)` and `isConnected(consultationId, accountId)`.

---

## `prescription` — e-prescriptions + PDF

- **`PrescriptionController`** (`/api/prescriptions`): `issue` (doctor), role-aware
  `list`, `get`, `pdf` (`/{id}/pdf`, `application/pdf`).
- **`PrescriptionService`** — `issue` (verifies the doctor owns the appointment,
  409 if cancelled, then **notifies the patient** with a `PRESCRIPTION_ISSUED`
  notification → their bell + mobile Alerts + email so they actually receive it),
  `listForDoctor`/`listForPatient`, `get`.
- **domain**: `Prescription` (doctor, patient, `appointmentId`, title, body,
  issuedAt).
- **dto**: `IssuePrescriptionRequest`, `PrescriptionDto` (+ `displayName` helper).
- **`PrescriptionRepository`** — patient/doctor listing queries.

---

## `payment` — simulated billing

- **`InvoiceController`** (`/api/invoices`): role-aware `list`, `summary`, `pay`
  (`/{id}/pay`, patient, optional `PayRequest`), `reimburse` (`/{id}/reimburse`).
- **`PaymentController`** — legacy/auxiliary payment endpoints (kept alongside
  `InvoiceController`; both are mounted without path collisions).
- **`PaymentService`** — `listForPatient`/`listForDoctor` (lazily `syncInvoices`
  from COMPLETED appointments, idempotent on unique `appointment_id`),
  `summaryForDoctor`/`summaryForPatient`, `pay` (PENDING→PAID, notifies doctor
  `INVOICE_PAID`), `reimburse` (PAID→REIMBURSED at 0.70). `DEFAULT_FEE = 500.00 MRU`.
- **domain**: `Invoice` (appointment, doctor, patient, amount, currency, status
  PENDING/PAID/REIMBURSED, method, paid/reimbursed timestamps,
  `appointmentStartAt`).
- **dto**: `InvoiceDto`, `PayRequest` (method pattern), `PaymentSummaryDto`.
- **`InvoiceRepository`** — patient/doctor listings, `totalCollected`, status counts.

---

## `notification` — feed + email mirror

- **`NotificationController`** (`/api/notifications`): `list` (paged),
  `unreadCount`, `markRead` (`/{id}/read`), `markAllRead` (`/read-all`).
- **`NotificationService`** — `notify(accountId, type, title, body, link)`
  (persists + `sendEmailQuietly` via `JavaMailSender`), `listMine`, `unreadCount`,
  `markRead`, `markAllRead`. Mail-from from `telemedecine.mail.from`.
- **domain**: `Notification` (Type enum incl. ADMIN_MESSAGE, APPOINTMENT_*,
  NEW_CHAT_MESSAGE, INVOICE_PAID, SYSTEM; read flag, link).
- **dto**: `NotificationDto`.
- **`NotificationRepository`** — `findByAccountIdOrderByCreatedAtDesc` (paged),
  `countByAccountIdAndReadFalse`, `markAllRead`.

---

## `admin` — moderation + oversight

- **`AdminBootstrap`** — seeds the admin account on first start (dev/test only).
- **`AdminController`** (`/api/admin`): `metrics`, `accounts` (search), account
  `suspend`/`activate`/`notify` (`/accounts/{id}/…`), and `broadcast`
  (`/notifications/broadcast`).
- **`VerificationController`** (`/api/admin/verifications`): `list`, `get`,
  credential `download`, `approve`, `reject`.
- **application**: `AdminMetricsService` (`metrics()` aggregates cross-module
  counts + a 14-day appointment trend + collected revenue),
  `AccountAdminService` (`list` via `searchForAdmin`; `suspend` blocks self/admins,
  revokes refresh tokens, notifies; `activate`; `message`; `broadcast`),
  `VerificationService` (review workflow flipping the doctor verified flag),
  `VerificationCaseListener` (creates a case on `CredentialUploadedEvent`).
- **domain**: `VerificationCase` (status PENDING/APPROVED/REJECTED, reviewer,
  decision note).
- **dto**: `AdminMetricsDto` (+ `DayCount`), `AccountSummaryDto`, `NotifyRequest`,
  `DecisionRequest`, `VerificationCaseDto`.
- **`VerificationCaseRepository`** — review queue queries.

---

## `storage` — file uploads

- **`LocalFileStorage`** — `store(category, MultipartFile)` writes to disk under
  `STORAGE_ROOT` and returns a `Stored` descriptor (key/name/contentType/size);
  read/stream helpers for downloads.
- **`StorageProperties`** — bound `telemedecine.storage.*` (root dir, limits).

---

## Database migrations

`backend/src/main/resources/db/migration`:

| Version | Adds |
|---|---|
| V1 `init` | accounts, roles, audit schema |
| V2 `auth 2fa` | TOTP secrets, OTP/reset tokens |
| V3 `profiles` | patient + doctor profiles, specialties, credentials |
| V4 `appointments` | appointments + doctor availability |
| V5 `consultations` | consultations, chat messages, clinical notes |
| V6 `prescriptions` | `prescription` table + indexes |
| V7 `notifications invoices` | `notification` + `invoice` tables, CHECK constraints, indexes |

All seven apply cleanly on a fresh database (verified by booting the packaged jar
against a throwaway Postgres).
