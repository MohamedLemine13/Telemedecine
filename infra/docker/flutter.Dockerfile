# Dockerized Flutter build — produces a debug APK for the patient app without
# any Flutter/Android SDK on the host. The platform scaffolding (android/,
# gradle wrapper, etc.) is generated *inside* the container by `flutter create`,
# then our source is overlaid on top. The resulting APK is copied to a mounted
# ./mobile/dist on `run`.
#
#   docker compose --profile mobile run --rm mobile-build
#   adb install mobile/dist/telemed-patient.apk
#
# Point the app at your server by setting MOBILE_API_BASE_URL (see .env.example).
# It targets the nginx front door (HTTPS, proxies /api + /lk); the bundled CA is
# trusted at startup so no cert install is needed on the phone:
#   - Real device:       https://<your-LAN-or-public-ip>:4443   (default)
#   - Android emulator:  http://10.0.2.2:8080                   (backend direct)
FROM ghcr.io/cirruslabs/flutter:stable

WORKDIR /app

# 1) Generate the Android platform scaffolding from the Flutter template.
RUN flutter create --platforms=android --org com.irt42 --project-name telemed_mobile . \
    && rm -rf test

# 2) Overlay our project: dependencies, Dart source, bundled assets (the project
#    CA, trusted at startup for HTTPS/WSS), and the permission/cleartext manifest.
#    These overwrite the template's defaults.
COPY pubspec.yaml ./pubspec.yaml
COPY analysis_options.yaml ./analysis_options.yaml
COPY lib ./lib
COPY assets ./assets
COPY android/app/src/main/AndroidManifest.xml ./android/app/src/main/AndroidManifest.xml

# 3) livekit_client / flutter_webrtc need a higher minSdk than the template's
#    default. Bump it in whichever gradle dialect the template emitted.
RUN find android -name "build.gradle*" -exec sed -i 's/flutter.minSdkVersion/23/g' {} +

RUN flutter pub get

ARG API_BASE_URL=https://187.124.219.82:4443
RUN flutter build apk --debug --dart-define=API_BASE_URL=$API_BASE_URL

# On `run`, drop the APK into the mounted ./mobile/dist.
CMD ["sh", "-c", "mkdir -p /out && cp build/app/outputs/flutter-apk/app-debug.apk /out/telemed-patient.apk && echo 'Built -> mobile/dist/telemed-patient.apk'"]
