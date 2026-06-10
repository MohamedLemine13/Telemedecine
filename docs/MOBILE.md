# Mobile reference

Flutter **patient** app. Doctors and admins can sign in but are shown a "use the
web portal" screen — the app is intentionally patient-only. It talks to the same
Spring Boot backend over HTTP (Dio) and joins the same LiveKit rooms for calls.

State management: `provider` for DI + `ChangeNotifier` for the session; one
service per backend concern. Models mirror the backend DTOs 1:1.

Source lives in `mobile/lib`. This file walks every file and what it does.

---

## Entry points

| File | Purpose |
|---|---|
| `main.dart` | App entry — constructs `AuthStore`, calls `bootstrap()` (loads stored tokens), runs `TelemedApp`. |
| `app.dart` | `TelemedApp` wires the `MultiProvider` (ApiClient + all services) and `MaterialApp`. `_Gate` routes: loading → `LoginScreen` (not signed in) → `_WrongRoleScreen` (signed in but not a patient) → `HomeShell`. |

---

## `core` — plumbing

| File | Purpose |
|---|---|
| `config.dart` | `AppConfig`: `apiBaseUrl` (emulator/host aware) and `livekitUrlFor()` which rewrites `localhost` to the API host so a phone can reach LiveKit. |
| `platform.dart` | Small platform helpers (emulator detection / base-URL selection). |
| `api_client.dart` | `ApiClient`: a configured `Dio` with an interceptor that attaches the bearer token and refreshes once on 401 (delegating to `AuthStore`). All services use `_api.dio`. |
| `auth_store.dart` | `AuthStore extends ChangeNotifier`: token storage in `flutter_secure_storage`; `bootstrap`, `login` (handles the 2FA challenge branch), `verifyTfa`, `signup` (sends `ROLE_PATIENT`), `refresh`, `logout`. Role getters `isPatient`/`isDoctor`/`isAdmin` parse the JWT `roles` claim (`_parseRoles`). |
| `models.dart` | Plain data models matching the backend JSON: `TokenPair`, `LoginResult`, `Specialty`, `Doctor`, `Slot`, `Party`, `Appointment`, `JoinInfo`, `ChatMessage`, `PatientProfile`, and the generic `pageContent<T>` helper for Spring `Page<T>`. |

---

## `services` — backend wrappers

| File | Exposes |
|---|---|
| `doctor_service.dart` | `DoctorService`: search verified doctors, fetch specialties, doctor detail. |
| `appointment_service.dart` | `AppointmentService`: list appointments, fetch a doctor's free slots, book, reschedule, cancel. |
| `consultation_service.dart` | `ConsultationService`: `join` a consultation (→ `JoinInfo`), `end`, fetch/send chat messages. |
| `patient_service.dart` | `PatientService`: `me()` (profile) and `prescriptions()` (GET `/api/prescriptions`, tolerant of failure → empty list). |
| `notification_service.dart` | `NotificationService`: `list`, `unreadCount`, `markRead`, `markAllRead` (all tolerant of failure). Model `AppNotification`. The in-app push stand-in. |

---

## `ui` — screens

| File | Purpose |
|---|---|
| `home/home_shell.dart` | `HomeShell` — bottom `NavigationBar` with five tabs (Appointments, Doctors, Records, Alerts, Profile) over an `IndexedStack`. `_goToAppointments` jumps back after booking. |
| `auth/login_screen.dart` | Email/password sign-in + sign-up + the 2FA code step; calls `AuthStore`. |
| `appointments/appointments_screen.dart` | Patient appointments with join/cancel; `refresh()` exposed via a `GlobalKey`. |
| `doctors/doctors_screen.dart` | Search doctors; `onBooked` callback returns to appointments. |
| `doctors/doctor_detail_screen.dart` | Doctor profile + slot picker → book. |
| `consultation/consultation_screen.dart` | LiveKit call screen — joins the room via `ConsultationService`, renders remote/local video, mic/cam controls, in-call chat. Uses `AppConfig.livekitUrlFor`. |
| `prescriptions/prescriptions_screen.dart` | Real prescriptions list (the "Records" tab); pull-to-refresh; tap opens a bottom sheet with the full medication details. |
| `notifications/notifications_screen.dart` | Alerts feed — pull-to-refresh, per-type icons, "mark all read", taps mark read. The push-notification equivalent. |
| `profile/profile_screen.dart` | Patient profile summary + sign-out. |
| `theme.dart` | `Palette` colours + `buildTheme()` Material theme. |
| `widgets/common.dart` | Shared widgets incl. `EmptyState` (icon/title/subtitle/action). |

---

## How a patient uses it

1. **Sign in / sign up** (`login_screen`) → tokens stored securely; non-patients
   hit `_WrongRoleScreen`.
2. **Doctors** tab → search → **doctor detail** → pick a slot → book.
3. **Appointments** tab → at call time, open the consultation → **call screen**
   (video/phone + chat) via LiveKit.
4. **Records** tab → read prescriptions, open one for full medication details.
5. **Alerts** tab → appointment confirmations, doctor messages, billing and
   health alerts (polled from the backend feed, mirrored to email).
6. **Profile** tab → view profile, sign out.

---

## Build

```sh
cd mobile
flutter pub get
flutter run                       # device / emulator
# or the web preview through Docker:
docker compose --profile mobile-web up -d --build mobile-web   # http://localhost:4300
```

`flutter analyze` is clean (only minor pre-existing style infos). Set
`MOBILE_API_BASE_URL` for physical devices; the Android emulator uses
`http://10.0.2.2:8080` by default.
