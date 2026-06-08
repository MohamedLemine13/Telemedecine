# Dockerized Flutter build — produces a debug APK for the patient app without
# any Flutter/Android SDK on the host. The platform scaffolding (android/,
# gradle wrapper, etc.) is generated *inside* the container by `flutter create`,
# then our source is overlaid on top. The resulting APK is copied to a mounted
# ./mobile/dist on `run`.
#
#   docker compose --profile mobile run --rm mobile-build
#   adb install mobile/dist/telemed-patient.apk
#
# Point the app at your backend by setting MOBILE_API_BASE_URL (see .env.example):
#   - Android emulator:  http://10.0.2.2:8080
#   - Real device:       http://<your-LAN-ip>:8080
FROM ghcr.io/cirruslabs/flutter:stable

WORKDIR /app

# 1) Generate the Android platform scaffolding from the Flutter template.
RUN flutter create --platforms=android --org com.irt42 --project-name telemed_mobile . \
    && rm -rf test

# 2) Overlay our project: dependencies, Dart source, and the permission/cleartext
#    manifest. These overwrite the template's defaults.
COPY pubspec.yaml ./pubspec.yaml
COPY analysis_options.yaml ./analysis_options.yaml
COPY lib ./lib
COPY android/app/src/main/AndroidManifest.xml ./android/app/src/main/AndroidManifest.xml

# 3) livekit_client / flutter_webrtc need a higher minSdk than the template's
#    default. Bump it in whichever gradle dialect the template emitted.
RUN find android -name "build.gradle*" -exec sed -i 's/flutter.minSdkVersion/23/g' {} +

RUN flutter pub get

ARG API_BASE_URL=http://10.0.2.2:8080
RUN flutter build apk --debug --dart-define=API_BASE_URL=$API_BASE_URL

# On `run`, drop the APK into the mounted ./mobile/dist.
CMD ["sh", "-c", "mkdir -p /out && cp build/app/outputs/flutter-apk/app-debug.apk /out/telemed-patient.apk && echo 'Built -> mobile/dist/telemed-patient.apk'"]
