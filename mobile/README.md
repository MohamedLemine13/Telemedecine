# Telemedecine — Patient Mobile App (Flutter)

A Flutter patient app for the Telemedecine platform. It reuses the existing
Spring Boot API — no backend changes required. Scope (core loop):

- **Auth** — sign up / sign in as a patient (with optional TOTP 2FA step).
- **Find a doctor** — searchable list, doctor profile, open slot picker.
- **Book** — pick a slot + mode (video/phone), with a reason.
- **Appointments** — upcoming / past / cancelled, cancel, **Join call**.
- **Live consultation** — LiveKit video + audio, in-call chat (REST-polled),
  graceful degradation to chat-only if video can't connect.
- **Prescriptions** — empty "coming soon" state until the Phase-5 backend ships.

## Architecture

```
lib/
  core/      config, models (mirror backend DTOs), Dio client, auth store
  services/  one thin service per API area (doctor, appointment, consultation…)
  ui/        theme + screens (auth, home shell, doctors, appointments, call…)
```

State is plain `provider` + `ChangeNotifier`. Tokens live in the platform
keystore (`flutter_secure_storage`); the Dio client attaches the bearer and
refreshes once on a 401.

## Build the APK (dockerized — no host SDK needed)

```bash
# from the repo root, with the backend stack already up
docker compose --profile mobile run --rm mobile-build
# → mobile/dist/telemed-patient.apk
adb install mobile/dist/telemed-patient.apk
```

### Pointing the app at the backend

The app needs an absolute URL it can reach from the device. Set it at build
time via `MOBILE_API_BASE_URL` (consumed as a `--dart-define`):

| Target            | MOBILE_API_BASE_URL              |
|-------------------|----------------------------------|
| Android emulator  | `http://10.0.2.2:8080` (default) |
| Real phone (LAN)  | `http://<your-computer-LAN-ip>:8080` |

```bash
MOBILE_API_BASE_URL=http://192.168.1.20:8080 \
  docker compose --profile mobile run --rm mobile-build
```

LiveKit (`:7880`) is reached on the **same host** as the API — the app derives
the `ws://<host>:7880` URL from `MOBILE_API_BASE_URL`, so there's nothing else
to configure. For a real phone, make sure ports **8080** and **7880** (plus the
LiveKit UDP range **50000–50100**) are reachable on your LAN / firewall.

> Dev build uses cleartext `http://` + `ws://` and a debug signature
> (`android:usesCleartextTraffic="true"`). A production build would switch to
> `https`/`wss` and a real signing config.

## Run as a Linux desktop app

A native desktop window (same UI as mobile). Needs the Flutter SDK + GTK
toolchain on the host — a GUI window can't be served from a container.

```bash
cd mobile
./scripts/setup-linux-desktop.sh        # installs deps, scaffolds linux/, pub get
flutter run -d linux --dart-define=API_BASE_URL=http://localhost:8080
```

Desktop specifics (handled in code):
- `permission_handler` is **skipped on desktop** (it has no Linux
  implementation and would throw `MissingPluginException`); `flutter_webrtc`
  opens the camera/mic directly. The app uses no GPS/WiFi plugins.
- `flutter_secure_storage` needs a system keyring on Linux; if none is present
  the token store degrades to in-memory (session-only) instead of crashing.
- No CORS — desktop HTTP is direct, so point `API_BASE_URL` straight at
  `http://localhost:8080`.
- Video over `flutter_webrtc` on Linux is experimental; on failure the call
  degrades to chat-only by design.

## Iterating with a host SDK (optional)

If you later install the Flutter SDK locally for hot reload:

```bash
cd mobile
flutter create --platforms=android --org com.irt42 --project-name telemed_mobile .
# restore the tracked manifest overlay if flutter create overwrote it:
git checkout -- android/app/src/main/AndroidManifest.xml
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
```
