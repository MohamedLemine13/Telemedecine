# Frontend reference

Angular 21 single-page app: standalone components, **Signals** for state, Tailwind
4 for styling, lazy-loaded feature routes behind role shells. Served by nginx,
which proxies `/api`, `/ws`, `/lk`, swagger and actuator to the backend.

Source lives in `frontend/src`. This file walks every file and what it does.

---

## Bootstrap & routing

| File | Purpose |
|---|---|
| `app.ts` | Root standalone component (`<router-outlet>`). |
| `app.config.ts` | App providers: router, HTTP client with the interceptor chain, zone/signals config. |
| `app.routes.ts` | Top-level routes → role shells (`/patient`, `/doctor`, `/admin`, `/auth`), legal/help, error pages, guarded redirects. |
| `environments/environment*.ts` | `apiBaseUrl` (empty = same-origin via nginx) and informational LiveKit URL, per build configuration. |

---

## `core/api` — backend HTTP clients

| File | Exposes |
|---|---|
| `appointment.api.ts` | `AppointmentApi`: `book`, `list`, `get`, `reschedule`, `cancel`, `complete`, `myPatients`, `slots`, `getAvailability`, `setAvailability`. Types: `AppointmentDto`, `SlotDto`, `AvailabilityDto`, `DoctorPatientDto`, `Page<T>`. |
| `consultation.api.ts` | `ConsultationApi`: `conversations`, `reportPdf` (blob), `join`, `end`, `messages`, `send`, `getNote`, `saveNote`. Types: `JoinResponse`, `ChatMessageDto`, `ClinicalNoteDto`, `ConversationDto`. |
| `prescription.api.ts` | `PrescriptionApi`: `list`, `get`, `issue`, `pdf` (blob). Types: `PrescriptionDto`, `IssuePrescriptionRequest`. |
| `invoice.api.ts` | `InvoiceApi`: `list`, `summary`, `pay`, `reimburse`. Types: `InvoiceDto`, `PaymentSummaryDto`. |
| `notification.api.ts` | `NotificationApi`: `list`, `unreadCount`, `markRead`, `markAllRead`. Type: `NotificationDto`. |
| `chat-socket.ts` | `ChatSocket`: thin WebSocket wrapper. `connect(consultationId, onMessage)` opens `/ws/chat?consultationId&token`; `disconnect()`; `connected` getter. Receive-only — sending stays on REST. |
| `util/download.ts` | `saveBlob(blob, filename)` — triggers a browser "save as" for PDFs fetched as blobs. |

---

## `core/i18n` — runtime FR/EN translation

| File | Purpose |
|---|---|
| `translations.ts` | `Lang` (`'en' \| 'fr'`), the `LANGS` list, and the `TRANSLATIONS` dictionary (semantic dot-path keys → `{ en, fr }`). Extend here to translate more strings. |
| `locale.service.ts` | `LocaleService`: a `lang` signal (persisted to `localStorage`, seeded from the browser, French default), `setLang`/`toggle`, `t(key)` lookup, and it mirrors the choice onto `<html lang>`. |
| `translate.pipe.ts` | `TranslatePipe` (`'key' \| t`) — impure so it re-renders every string when the language signal flips. |

The `LanguageSwitcher` (FR/EN segmented toggle, in `shared/ui`) sits in the topbar **and** on the auth page, so any user can switch before or after signing in. The role shells build their nav from `LocaleService.t(...)` inside a `computed`, so the whole sidebar + topbar title switch instantly; the patient dashboard and medical-record gender labels are translated too.

---

## `core/auth` — session & guards

| File | Purpose |
|---|---|
| `auth.store.ts` | `AuthStore` signal store: `user`/`tokens` signals, `isAuthenticated`, `accessToken`, `hasRole`, `setSession` (parses the JWT claims), `clear`, `homePathForRole`. Persists to `localStorage`. |
| `auth.api.ts` | `AuthApi`: `signup`, `login`, `refresh`, `logout`, 2FA setup/enable/verify/disable, `changePassword`. `SKIP_AUTH` context token for the refresh call. |
| `auth.guard.ts` | `authGuard` — requires a session, else `/auth/login`. |
| `role.guard.ts` | `roleGuard` — requires the route's `data.role`. |
| `root-redirect.guard.ts` | `rootRedirectGuard` — sends `/` to the right role home. |

---

## `core/http` — interceptors

| File | Purpose |
|---|---|
| `auth.interceptor.ts` | Attaches the bearer token; on 401 refreshes once and retries. |
| `error.interceptor.ts` | Normalises backend RFC-7807 errors for components. |
| `correlation-id.interceptor.ts` | Adds a request correlation id header. |
| `loading.interceptor.ts` | Tracks in-flight requests for global loading UI. |

---

## `features/auth`

`auth.routes.ts` + screens: `login`, `signup`, `tfa-setup`, `tfa-verify`. Reactive
forms; on success they call `AuthStore.setSession` and redirect to the role home.
(`signup/verify-email`, `password/forgot|reset`, `sso/callback` are route stubs.)

---

## `features/patient`

| File | Purpose |
|---|---|
| `patient.routes.ts` | Patient routes (dashboard, doctors, medical-record, appointments, consultations, prescriptions, messages, payments, settings). |
| `patient.api.ts` | `PatientApi`: profile + allergy/treatment/lab-result CRUD. |
| `dashboard/patient-dashboard.ts` | Patient home — **live** stat strip (upcoming / prescriptions / amount due / reimbursed), quick actions, upcoming appointments with a Join button, recent prescriptions and recent invoices, all fetched in one `forkJoin` over the appointment/prescription/invoice APIs. |
| `doctors-search/doctors-search.ts` | Search verified doctors by specialty/language. |
| `doctor-detail/doctor-detail.ts` | Doctor profile + free-slot picker → book. |
| `appointments/appointments-list.ts` | Filterable appointments with join/reschedule/cancel inline actions. |
| `medical-record/medical-record.ts` | Edit profile + manage allergies/treatments/lab results. Gender/biological sex is restricted to **Male/Female**. |
| `prescriptions/prescriptions-list.ts` | List prescriptions, expand to read, download PDF. |
| `payments/payments-page.ts` | Invoices + summary; pay (mock card / mobile money) and claim reimbursement. |

---

## `features/doctor`

| File | Purpose |
|---|---|
| `doctor.routes.ts` | Doctor routes; all except `profile`/`settings` are gated by `doctorProfileGuard`. |
| `doctor-profile.guard.ts` | `doctorProfileGuard` — redirects to `/doctor/profile` until the profile has a first + last name (`doctorProfileComplete`). |
| `doctor.api.ts` | `DoctorApi`: search/specialties, `getMine`, `updateMine`, `uploadCredential`. |
| `dashboard/doctor-dashboard.ts` | Doctor home — **live** KPIs (today / this week / patients / completed), today's schedule with Start buttons, weekly-availability summary, next appointments and recent patients, from the appointment + availability + my-patients APIs. |
| `profile/doctor-profile-page.ts` | Edit public profile, specialties, languages, upload credentials. |
| `agenda/doctor-agenda.ts` | Day/list view of appointments with join/complete/cancel, plus a **℞ Prescribe** action on every non-cancelled appointment that opens the composer pre-filled. |
| `availability/availability-editor.ts` | Weekly availability blocks; surfaces backend validation errors. |
| `patients/patients-list.ts` | "My patients" roster with search + visit history. |
| `prescriptions/issue-prescription.ts` | Compose & issue a prescription for an appointment; download its PDF (accepts `?appointmentId=`). |
| `payouts/payouts-page.ts` | Read-only earnings: invoices + collected total. |

---

## `features/admin`

| File | Purpose |
|---|---|
| `admin.routes.ts` | Admin routes (dashboard, verifications, accounts, reports, settings). |
| `admin.api.ts` | `AdminApi`: verification `list`/`get`/`downloadCredential`/`approve`/`reject`. |
| `admin-metrics.api.ts` | `AdminMetricsApi`: `metrics`, `accounts`, `suspend`, `activate`, `notifyOne`, `broadcast`. Types: `AdminMetricsDto`, `AccountSummaryDto`, `DayCount`, `RoleCode`. |
| `dashboard/admin-dashboard.ts` | Live KPI cards (users/doctors/appointments/revenue/prescriptions) + secondary counters, an **appointments-by-status** bar breakdown with completion rate, a **platform-health** panel (verification rate, pending verifications, active consultations, unpaid invoices, revenue) and quick-management tiles — all from `metrics()`. |
| `reports/reports-page.ts` | Detailed metric tables + a 14-day appointment bar chart. |
| `accounts/accounts-list.ts` | Search/filter accounts; suspend/activate; notify one user; broadcast to a role. |
| `verifications/verifications-list.ts` | Pending verification queue. |
| `verifications/verification-detail.ts` | Review a case: download credentials, approve/reject with a note. |

---

## `features/consultation`

`video-consultation-room.ts` — the live call room used by both roles.
- Joins via `ConsultationApi.join`, connects LiveKit with `connectRoom` trying
  `livekitCandidates` (advertised URL with localhost→host rewrite, then the `/lk`
  proxy), a fresh `Room` per attempt.
- **Camera/mic pre-flight** (`ensureMediaPermissions`): explicitly calls
  `getUserMedia` so the browser permission prompt fires up front, and maps
  failures to precise messages — denied, no device, in-use, or an insecure
  (`http://`) origin where the browser blocks media entirely (the usual cause of
  "the call always fails" when testing from a phone). A **Retry camera** button
  re-attempts after the user fixes permissions, without dropping chat.
- Degrades to chat-only on video failure; mic/cam toggles; remote-presence dot.
- Chat tab (REST + 3s poll) and, for doctors, a Notes tab (debounced autosave).
- Ending the call only **completes the appointment when the doctor ends it** — a
  patient stepping out (or dropping) leaves the consultation open to rejoin.
- Ended state (doctor): download **report PDF** (`reportPdf` + `saveBlob`) and
  **write prescription** (navigates to the composer with `?appointmentId=`).

---

## `features/messaging`

`messages-page.ts` — secure conversations, shared by patient and doctor, styled
like a modern chat app (WhatsApp / Instagram DM).
- A compact conversation rail (coloured **initials avatars**, name, last-message
  preview, relative time, live presence dot) with a **search box**; the rail
  collapses on mobile when a thread is open (with a back button).
- A large thread pane with chat-bubble styling, a rounded composer, and a
  live/polling indicator.
- Lists conversations (`ConsultationApi.conversations`); selecting one opens the
  thread. Real-time via `ChatSocket` with a 5s polling fallback; sending goes
  through REST; bubbles aligned by `auth.user().id`; the rail preview/time updates
  as new messages land.

---

## `features/settings`, `legal`, `help`, `errors`

| File | Purpose |
|---|---|
| `settings/settings.ts` | Account info, 2FA enrol/disable, **change password** (reactive form), notification + language info. Shared by all roles. |
| `legal/terms.ts`, `legal/privacy.ts` | Static Terms / Privacy pages. |
| `help/faq.ts` | Accordion FAQ covering booking, calls, availability, prescriptions, billing, messaging. |
| `errors/not-found.ts`, `errors/forbidden.ts` | 404 / 403 pages. |
| `shared/route-stub/*` | `RouteStub` / `ComingSoon` placeholders for not-yet-built auth sub-routes. |

---

## `layouts` — role shells

`patient-shell`, `doctor-shell`, `admin-shell` each render the sidebar nav + topbar
+ `<router-outlet>` and declare their nav groups. `auth-shell` is the
unauthenticated frame.

---

## `shared/ui` — design system

Barrel `index.ts` re-exports every primitive:
`Button`, `Input` (ControlValueAccessor), `Card`, `KpiCard` (SVG sparkline),
`UserMenu`, `EmptyState`, `Icon` (+ `icons.ts` set), `SidebarNav`
(`NavItem`/`NavGroup`), `Topbar`, `NotificationBell`, `PageHeader`, `StatusBadge`
(`StatusVariant`).

`notification-bell/notification-bell.ts` — `NotificationBell`: polls
`unreadCount` every 30s, opens a dropdown feed (`list`), marks items read on
click and navigates to their `link`, "mark all read" action. Embedded in the
shared `Topbar`, so every role gets it.
