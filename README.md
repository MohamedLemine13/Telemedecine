# Telemedecine

An online telemedicine platform with three role-spaces — **patient**, **doctor**, and **administrator** — built as an Angular 21 web app, a Spring Boot 3 backend, and a Flutter patient mobile app.

**This is a school project**, so it favours clarity and a working demo flow over production hardening: BCrypt for passwords (no Argon2id / KMS), local-disk storage for uploaded files (no S3 / MinIO), and **simulated** billing/reimbursement (no real payment provider).

---

## Features

**Web — doctor space:** agenda, appointment management, weekly availability editor, integrated video/phone consultations, real-time secure messaging, clinical notes, consultation-report PDFs, prescription issuing (PDF), earnings/payouts, profile-first onboarding gate.

**Web — patient space:** find a doctor, book/reschedule/cancel appointments, medical record (history, allergies, treatments, lab results), video/phone consultations, real-time messaging, prescriptions (view + PDF), simulated payments & reimbursement.

**Web — admin space:** live KPI dashboard, platform reports, doctor verification review, user account management (search, suspend/reactivate, notify), broadcast notifications.

**Mobile (patient):** appointment booking + teleconsultation, prescriptions/medical record, in-app alerts feed (the push-notification stand-in), secure session storage. Doctors/admins who sign in are shown a "use the web portal" screen.

**Cross-cutting tech:** WebSocket real-time chat, Spring Security multi-role + JWT with refresh-token rotation + optional TOTP 2FA, PDF generation (OpenPDF), Angular reactive forms & Signals stores, persisted in-app notifications mirrored to email.

---

## Repository layout

```
.
├── frontend/        Angular 21.2 + Tailwind 4
├── backend/         Spring Boot 3.5 + Java 21 (Maven, modular monolith)
├── mobile/          Flutter patient app (Dio, LiveKit, secure storage)
├── design/          Figma exports — source of truth for visual design
├── infra/           Docker images, LiveKit, Postgres init scripts
└── docs/            Project report + the documentation set below
```

### Documentation set

| Doc | Covers |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System architecture, modules, data flow, security model |
| [`docs/BACKEND.md`](docs/BACKEND.md) | Every backend package, file, and the functions they expose |
| [`docs/FRONTEND.md`](docs/FRONTEND.md) | Every frontend feature, API client, component, and route |
| [`docs/MOBILE.md`](docs/MOBILE.md) | Every Flutter file, service, and screen |
| [`docs/report.typ`](docs/report.typ) | Academic report (Typst source) |

---

## Prerequisites

| Tool | Notes |
|---|---|
| Docker | with Docker Compose v2 (`docker compose …`) |

Everything else (Java 21, Node 20, Maven, npm, Flutter) runs **inside containers** — except the mobile app, which you build with a local Flutter SDK or the provided Flutter Docker image.

---

## Run everything (one command)

```sh
cp .env.example .env
docker compose up -d --build
```

Once everything is healthy:

| URL | What |
|---|---|
| <http://localhost:4200> | The web app — Angular SPA |
| <http://localhost:4200/swagger-ui.html> | Swagger UI (proxied) |
| <http://localhost:8080/swagger-ui.html> | Swagger UI (direct) |
| <http://localhost:8025> | MailHog — captured outbound email |
| <http://localhost:4300> | Mobile app compiled to web (optional `mobile-web` profile) |
| `ws://localhost:7880` | LiveKit signalling (video/phone calls) |

### Seeded admin account

The backend creates an admin on first start (dev/test profiles only):

| Field | Value |
|---|---|
| Email | `admin@telemed.local` |
| Password | `Admin@1234567` |

Sign in at <http://localhost:4200/auth/login>.

### Network / device access (video calls)

For the browser or phone to reach LiveKit from another machine, set the LAN-facing
URL in `.env` before `up`:

```sh
LIVEKIT_PUBLIC_URL=ws://<your-LAN-ip>:7880
MACHINE_IP=<your-LAN-ip>
```

The web client also falls back to the same-origin `/lk` nginx proxy automatically if
the advertised URL is unreachable, so localhost demos work with no extra config.

### Common compose commands

```sh
docker compose logs -f backend       # tail backend logs
docker compose ps                    # see service health
docker compose up -d --build backend # after backend code changes
docker compose down                  # stop, keep DB + uploads
docker compose down -v               # stop AND wipe data (incl. credentials on disk)
```

### Mobile app

```sh
cd mobile
flutter pub get
flutter run                          # against a device/emulator
# or build the web preview via Docker:
docker compose --profile mobile-web up -d --build mobile-web   # http://localhost:4300
```

The mobile app talks to the same backend. On the Android emulator it reaches the host
at `http://10.0.2.2:8080`; set `MOBILE_API_BASE_URL` for physical devices.

---

## Demo flow (school-project happy path)

1. Open <http://localhost:4200> → redirects to `/auth/login`.
2. Sign up as **a doctor**. You are taken to **Profile** and held there until you fill in
   your name (the profile-first onboarding gate).
3. Complete the profile (name, specialties, languages) and **upload a credential**
   (any PDF / image up to 10 MB).
4. Sign out, then sign in as `admin@telemed.local` / `Admin@1234567`.
5. Open **Verifications**, open the doctor's case, download their credential, then **Approve**.
   The **Dashboard** and **Reports** show live platform KPIs; **Accounts** lets you
   search, suspend and notify users.
6. Sign out, sign up as **a patient**. Open **Find a doctor** — the verified doctor now appears.
7. As the doctor, open **Availability** and add a weekly block. As the patient, **book** a slot.
8. At the scheduled time either side opens the appointment and **Join call** — video/phone +
   real-time chat. The doctor can write **clinical notes**, download a **report PDF**, and
   **issue a prescription** (also a PDF).
9. The doctor **completes** the appointment → an **invoice** appears under the patient's
   **Payments** and the doctor's **Payouts**. The patient pays (mock) and claims the
   simulated reimbursement.

---

## Architecture (short version)

- **Frontend**: Angular 21 standalone components + Signals, Tailwind 4. Served by nginx in
  Docker with `/api/*`, `/ws/*`, `/lk/*`, `/v3/api-docs`, `/swagger-ui*`, `/actuator/*`
  proxied to the backend / LiveKit.
- **Backend**: Spring Boot 3.5 modular monolith under `com.irt42.telemedecine.*` with
  bounded-context modules (auth / patient / doctor / appointment / consultation /
  prescription / payment / notification / admin / common / config / storage), each split
  into `api` / `application` / `domain` / `infrastructure`. PostgreSQL 16 + Flyway. Spring
  Security 6 + JWT (refresh rotation) + TOTP 2FA. ArchUnit enforces the module/layer rules.
- **Real-time**: raw WebSocket (`/ws/chat`) broadcasts chat messages; REST remains the
  source of truth with a polling fallback.
- **Video**: self-hosted LiveKit; the backend mints access tokens and advertises the public URL.
- **PDF**: OpenPDF renders prescriptions and consultation reports.
- **File storage**: local disk under `/app/uploads`, a Docker volume. See `LocalFileStorage`.
- **Payments**: simulated — invoices are reconciled lazily from completed appointments.

Full details in [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

---

## License

TBD — academic project.
