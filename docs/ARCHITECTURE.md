# Architecture

This document explains how the Telemedecine platform is put together: the
overall topology, the backend module/layer rules, the data model, the security
model, and how the headline features (video, real-time chat, PDF, billing,
notifications) flow end-to-end.

For exhaustive file-by-file references see [`BACKEND.md`](BACKEND.md),
[`FRONTEND.md`](FRONTEND.md), and [`MOBILE.md`](MOBILE.md).

---

## 1. Topology

```
                    ┌──────────────────────────────────────────────┐
   Browser (SPA) ───┤ nginx (frontend container)                   │
   Flutter app  ───┤   /            → Angular static bundle        │
                    │   /api/*       → backend:8080                 │
                    │   /ws/*        → backend:8080  (WebSocket)    │
                    │   /lk/*        → livekit:7880 (WebSocket)     │
                    │   /swagger*, /v3/api-docs, /actuator/* → backend
                    └───────────────┬──────────────────────────────┘
                                    │
            ┌───────────────────────┼─────────────────────────┐
            │                       │                         │
     ┌──────▼──────┐        ┌───────▼───────┐         ┌───────▼───────┐
     │  backend    │        │  PostgreSQL 16 │         │   LiveKit      │
     │ Spring Boot │───────▶│  + Flyway      │         │  (SFU, video)  │
     │   :8080     │        └───────────────┘         └───────────────┘
     │             │
     │             │────────▶ MailHog (SMTP capture, dev)
     └─────────────┘
```

Everything is orchestrated by `docker-compose.yml`. Services: `postgres`,
`mailhog`, `livekit`, `backend`, `frontend`, and optional `mobile-build` /
`mobile-web` profiles.

The web client speaks only to its own origin; nginx reverse-proxies API,
WebSocket, and LiveKit traffic so there are no CORS concerns and a single URL
serves everything.

---

## 2. Backend: modular monolith

All backend code lives under `com.irt42.telemedecine`. It is a **modular
monolith**: one deployable, but organised into bounded-context modules that are
kept decoupled by ArchUnit tests (`ArchitectureTest`).

### Modules

| Module | Responsibility |
|---|---|
| `auth` | Accounts, roles, login, JWT + refresh tokens, TOTP 2FA, password reset |
| `patient` | Patient profile + medical record (history, allergies, treatments, lab results) |
| `doctor` | Doctor profile, specialties, credential uploads |
| `appointment` | Booking, rescheduling, cancellation, weekly availability, free-slot computation, "my patients" |
| `consultation` | Video/phone session join, LiveKit token minting, chat (REST + WebSocket), clinical notes, conversations, report PDF |
| `prescription` | Doctor-issued prescriptions + prescription PDF |
| `payment` | Simulated invoices, mock payment, simulated reimbursement, payout/spend summaries |
| `notification` | Persisted per-account notification feed + best-effort email mirror |
| `admin` | Bootstrap admin, doctor verification review, platform metrics, account management, broadcast |
| `common` | Shared base entity, error model, JPA auditing, PDF helper, global exception handler |
| `config` | Security, OpenAPI, WebSocket configuration |
| `storage` | Local-disk file storage for credential uploads |

### Layers (per module)

Each module is split into four layers:

```
<module>/
├── api/             REST controllers + request/response DTOs   (HTTP edge)
├── application/     Services — business logic, transactions
├── domain/          JPA entities + enums + domain events
└── infrastructure/  Spring Data repositories (+ ws/ for sockets)
```

### Enforced rules (`ArchitectureTest`)

- Controllers live only in `..api..`.
- **Layered access**: `api` is used only by `application`; `application` only by
  `api` + `infrastructure`; same-layer access is always allowed (so a service may
  call another module's service).
- `domain` never depends on `api` or `infrastructure`.
- Module slices must be acyclic. This holds because the "leaf" modules
  (`prescription`, `payment`, `notification`) are only ever *called into* — they
  do not depend back on the modules that use them, and `admin` depends on
  everything while nothing depends on `admin`.

---

## 3. Data model (high level)

```
account ─1:1─ patient_profile ─< allergy / treatment / lab_result
   │       └─1:1─ doctor_profile ─< credential
   │                    └─< doctor_availability
   │                    └─M:N─ specialty
   ├─< refresh_token / password_reset_token / email_otp / totp_secret
   ├─< notification
   └─ roles ─M:N─ role

appointment (doctor_profile, patient_profile)
   ├─1:1─ consultation ─< chat_message
   │                    └─1:1─ clinical_note
   ├─1:0..1─ prescription
   └─1:0..1─ invoice

verification_case (doctor_profile)
```

- `BaseEntity` gives every table a UUID id, `created_at` / `updated_at` audit
  columns, and an optimistic-lock `version`.
- Schema is owned by **Flyway** migrations `V1…V10`
  (`backend/src/main/resources/db/migration`). V6 adds prescriptions; V7 adds
  notifications + invoices; V8 widens the notification CHECK for
  `PRESCRIPTION_ISSUED`; V9 adds the `REIMBURSEMENT_REQUESTED` invoice status; V10
  adds `doctor_rating` (patient→doctor ratings, aggregated on `doctor_profile`).
- Nullable query params use the *coalesce-bind* idiom so a single JPQL query
  serves "filtered" and "unfiltered" reads.

---

## 4. Security model

- **Stateless JWT resource server.** Access tokens are HS256, carry the account
  `sub`, `email`, `roles`, and a `tfa_verified` flag; roles map to Spring
  authorities (`ROLE_PATIENT` / `ROLE_DOCTOR` / `ROLE_ADMIN`).
- **Refresh-token rotation.** Refresh tokens are persisted and rotated on use;
  password change and admin suspension revoke all active refresh tokens.
- **TOTP 2FA (optional).** Enrolment yields a provisioning URI; login returns a
  challenge that is exchanged for tokens after a valid 6-digit code.
- **Authorization.** Method-level `@PreAuthorize` on controllers plus a
  permit-list in `SecurityConfig` (auth endpoints, swagger, actuator health,
  `/ws/**`, `/lk/**`).
- **WebSocket auth.** Browsers can't set headers on a WS handshake, so the access
  token is passed as a `?token=` query param; `ChatSocketHandler` decodes it and
  verifies the caller is a participant of the consultation before accepting.
- **Frontend guards.** `authGuard`, `roleGuard`, `rootRedirectGuard`, and the
  doctor `doctorProfileGuard` (profile-first onboarding) gate the SPA routes; the
  HTTP `authInterceptor` attaches the bearer token and refreshes on 401.
- **TLS / secure context.** The frontend nginx terminates HTTPS on `:4443` using
  the project PKI in [`pki/`](../pki/): a local CA (`certs/ca.cert.pem`) signing a
  server cert whose **SAN includes the host IP** (browsers ignore CN). The
  fullchain + key are bind-mounted by `docker-compose.yml`, so certs rotate
  without an image rebuild. HTTPS is not cosmetic here — browsers block
  `getUserMedia` (camera/mic) outside a secure context, so the video call
  **requires** loading the app over `https://` (or `localhost`). Host `:443` is
  left to any pre-existing reverse proxy; this project uses `:4443`.

Deliberate simplifications: BCrypt instead of Argon2id, local
disk instead of object storage, no rate-limiting/WAF, simulated payments, a
self-managed CA (import `pki/certs/ca.cert.pem` to trust it) instead of a public
ACME/Let's Encrypt certificate.

---

## 5. Feature flows

### Appointment booking
Patient picks a doctor → `AvailabilityService.freeSlots` computes open slots from
the doctor's weekly template minus already-booked times (clinic-zone aware) →
`AppointmentService.book` validates the slot via `requireFreeSlot` and persists →
both parties get an `APPOINTMENT_BOOKED` notification.

### Video / phone consultation
Either party opens the appointment and calls `POST /api/consultations/{id}/join`
→ `ConsultationService` creates/loads the `Consultation`, `LivekitTokenService`
mints a LiveKit access token, and the response carries the public LiveKit URL.
The web room (`video-consultation-room.ts`) tries the advertised URL first
(rewriting `localhost`→page host for LAN access) then falls back to the
same-origin `/lk` proxy, creating a fresh `Room` per attempt. Chat + notes work
over REST regardless, so a video failure degrades to "chat only" rather than
killing the session.

### Real-time messaging
`POST …/messages` persists the message then `ChatSocketHandler.broadcast` pushes
it to every open socket for that consultation. If the counterpart is **not**
connected, a `NEW_CHAT_MESSAGE` notification is raised instead. Clients keep a 3–5s
polling fallback, so REST is always the source of truth.

### PDF generation
`common/pdf/PdfDocuments` wraps OpenPDF into a branded key/value + body document.
`PrescriptionController` renders prescriptions; `ConsultationController` renders the
doctor's consultation report. Both stream `application/pdf` bytes; the frontend
fetches them as blobs (so the bearer token is attached) and saves via `saveBlob`.

### Simulated billing
On reading invoices, `PaymentService` lazily reconciles one invoice per
**completed** appointment (idempotent, unique `appointment_id`). The patient pays
with a mock method (`MOCK_CARD` / `MOCK_MOBILE_MONEY`) → status `PAID` and the
doctor gets an `INVOICE_PAID` notification → the patient claims a simulated 70%
reimbursement → status `REIMBURSED`.

### Notifications (push stand-in)
`NotificationService.notify` persists a feed row and best-effort mirrors it to
email via `JavaMailSender` (MailHog in dev). The web topbar bell and the mobile
Alerts tab poll the feed; this substitutes for browser/OS push in the school
deployment.

### Admin
`AdminBootstrap` seeds the admin on first start. `VerificationService` drives
credential review (approve/reject flips the doctor's verified flag).
`AdminMetricsService` aggregates platform KPIs (incl. a 14-day appointment
trend). `AccountAdminService` powers search, suspend/reactivate (revoking refresh
tokens), per-user notify, and role broadcasts.

---

## 6. Frontend architecture

Angular 21, standalone components, **Signals** for local state (the modern
equivalent of an NgRx store for this size of app). Routing is lazy per feature
with role shells (`patient-shell`, `doctor-shell`, `admin-shell`, `auth-shell`).
HTTP goes through interceptors (auth bearer + refresh, correlation-id, global
error, loading). API clients in `core/api` and per-feature `*.api.ts` wrap the
backend; a shared design-system lives in `shared/ui`.

## 7. Mobile architecture

Flutter, patient-only. `Dio` HTTP client with a bearer/refresh interceptor
(`ApiClient`), `flutter_secure_storage` for tokens, `provider` for DI, and
`livekit_client` for calls. `AuthStore` parses JWT roles and the app gate routes
non-patients to a "use the web portal" screen. Services mirror the backend DTOs
1:1 (`models.dart`).
