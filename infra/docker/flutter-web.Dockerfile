# Dockerized Flutter *web* build of the patient app — runs the same Dart code as
# the APK but as a website, served by nginx and reachable in your browser. No
# phone or emulator needed.
#
#   docker compose --profile mobile-web up -d --build mobile-web
#   → open http://localhost:4300
#
# Built with an EMPTY API_BASE_URL so the app makes same-origin requests; the
# nginx stage reverse-proxies /api and /ws to the backend container (no CORS).
# LiveKit is reached at ws://localhost:7880 directly from the host browser.

# ─── Stage 1: build the web bundle ────────────────────────────────────────────
FROM ghcr.io/cirruslabs/flutter:stable AS build
WORKDIR /app

# Generate the web platform scaffolding from the template, then overlay our app.
RUN flutter create --platforms=web --org com.irt42 --project-name telemed_mobile . \
    && rm -rf test
COPY pubspec.yaml ./pubspec.yaml
COPY analysis_options.yaml ./analysis_options.yaml
COPY lib ./lib

RUN flutter pub get
# Empty API_BASE_URL → relative URLs, resolved same-origin by the browser.
RUN flutter build web --release --dart-define=API_BASE_URL=

# ─── Stage 2: nginx ───────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runtime
RUN apk add --no-cache curl
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.web.conf /etc/nginx/conf.d/app.conf
COPY --from=build /app/build/web /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s --start-period=10s --retries=5 \
  CMD curl -fsS http://localhost:80/ >/dev/null || exit 1
