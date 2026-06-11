# MailHog & LiveKit — what they are, why we use them, and the exact code

A defense-ready explainer for the two external services in the stack. For each:
**what it is**, **what we use it for**, **how it works**, and **the explicit code**
that wires it in. If you are asked "what is this and how did you use it?", the
answers are here.

---

## 1. MailHog — capturing the e-mails the app sends

### What it is
MailHog is a tiny **fake SMTP server** with a web inbox. It listens for outgoing
e-mail on port **1025** (SMTP) and shows every captured message in a UI on port
**8025** — nothing is ever sent to a real address. It is a *development* tool: it
lets us prove the app sends the right e-mails without a real mail provider, spam
risk, or credentials.

### What we use it for
Our app keeps an **in-app notification feed** (persisted in the database) and
**mirrors each notification to e-mail** as a best-effort copy. Examples: an
appointment is booked, a new chat message arrives, **a prescription is issued**.
MailHog is where those mirrored e-mails land so we can show them during the demo.

### How it works (flow)
```
Backend (Spring JavaMailSender) --SMTP:1025--> MailHog --captures--> Web inbox :8025
```
Spring Boot auto-configures a `JavaMailSender` from the `spring.mail.*`
properties. We point it at MailHog (`host=localhost`, `port=1025`, no auth, no
TLS). When we call `mail.send(...)`, Spring opens an SMTP connection to MailHog
instead of a real server, and the message appears at <http://localhost:8025>.

### The explicit code

**(a) Docker service** — `docker-compose.yml`:
```yaml
mailhog:
  image: mailhog/mailhog:latest
  container_name: telemed-mailhog
  restart: unless-stopped
  ports:
    - "1025:1025"   # SMTP — the backend sends here
    - "8025:8025"   # Web UI — we read captured mail here
```

**(b) Spring mail configuration** — `backend/src/main/resources/application.yml`:
```yaml
spring:
  mail:
    host: ${MAIL_HOST:localhost}   # in compose: MAIL_HOST=mailhog
    port: ${MAIL_PORT:1025}
    username: ${MAIL_USERNAME:}
    password: ${MAIL_PASSWORD:}
    properties:
      mail.smtp.auth: false        # MailHog needs no auth
      mail.smtp.starttls.enable: false
```
(In `docker-compose.yml` the backend gets `MAIL_HOST: mailhog` and `MAIL_PORT: 1025`
so it reaches the container by service name.)

**(c) Where we send mail** — `notification/application/NotificationService.java`.
Every notification is saved to the DB, then mirrored to e-mail. The mirror is
deliberately wrapped in try/catch so a mail failure never breaks the real action:
```java
private void sendEmailQuietly(UUID accountId, String subject, String body) {
    try {
        accounts.findById(accountId).ifPresent(account -> {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom("no-reply@telemedecine.local");
            msg.setTo(account.getEmail());
            msg.setSubject("[Telemedecine] " + subject);
            msg.setText(body == null ? subject : body);
            mail.send(msg);                 // <-- SMTP to MailHog
        });
    } catch (Exception e) {
        log.warn("Email mirror for notification failed (in-app copy is saved): {}",
                 e.getMessage());
    }
}
```
`JavaMailSender mail` is constructor-injected; Spring builds it from the config
above:
```java
public class NotificationService {
    private final JavaMailSender mail;          // auto-configured bean
    // ... saves the Notification entity, then calls sendEmailQuietly(...)
}
```

### One-line summary for the defense
> "MailHog is a fake SMTP inbox. Spring's `JavaMailSender` is pointed at it
> (`port 1025`), so every notification e-mail the app sends is captured and
> viewable at `:8025` — no real mail server needed. In production we'd just swap
> the host/port for a real SMTP provider; no code changes."

---

## 2. LiveKit — the real-time video/voice calls

### What it is
LiveKit is an open-source **WebRTC SFU** (Selective Forwarding Unit) — a media
server that relays audio/video between call participants. Browsers and phones
speak standard **WebRTC** to it; LiveKit forwards each participant's stream to
the others. We self-host it as a container (`livekit/livekit-server`), signalling
on port **7880**, media over the UDP range **50000–50100**.

### What we use it for
The **teleconsultation call** between a patient and a doctor — live video (or
audio-only for a "phone" appointment), with mic/camera toggles. The same call is
used by the web app and the Flutter mobile app.

### How it works (flow)
```
1. Client asks our backend to "join" a consultation.
2. Backend MINTS a LiveKit access token (a JWT) granting that one room.
3. Backend returns { livekitUrl, token, room, mode, ... }.
4. Client connects to LiveKit with (url, token) and publishes camera/mic.
5. LiveKit forwards streams between the two participants (media is DTLS-SRTP
   encrypted end to end; LiveKit only relays it).
```
Crucially, **the backend never touches media** — it only issues the token. The
token *is* the authorization: it is a JWT signed with the LiveKit API secret,
carrying a `video` grant that says "this identity may join this room".

### The explicit code

**(a) Docker service** — `docker-compose.yml`:
```yaml
livekit:
  image: livekit/livekit-server:latest
  # --node-ip is the address LiveKit advertises in ICE candidates for media;
  # it must be reachable by clients (LAN IP so phones can receive the streams).
  command: --config /etc/livekit.yaml --node-ip ${HOST_LAN_IP:-127.0.0.1}
  ports:
    - "7880:7880"                 # signalling (WebSocket)
    - "7881:7881"
    - "50000-50100:50000-50100/udp"  # WebRTC media
  volumes:
    - ./infra/livekit/livekit.yaml:/etc/livekit.yaml:ro
```

**(b) Backend config** — `application.yml` (the API key/secret are the shared
credential between our backend and the LiveKit server):
```yaml
telemedecine:
  livekit:
    url:        ${LIVEKIT_URL:ws://localhost:7880}        # internal
    public-url: ${LIVEKIT_PUBLIC_URL:ws://localhost:7880} # handed to the browser
    api-key:    ${LIVEKIT_API_KEY:devkey}
    api-secret: ${LIVEKIT_API_SECRET:devsecret-min-32-chars-aaaaaaaaaaaaaa}
```

**(c) Minting the token** — `consultation/application/LivekitTokenService.java`.
A LiveKit token is just an HS256 JWT signed with the API secret, carrying a
`video` grant. We build it with the Nimbus JOSE library (no LiveKit SDK needed):
```java
public String mint(String room, String identity, String name, long ttlSeconds) {
    Instant now = Instant.now();

    Map<String, Object> grant = new LinkedHashMap<>();
    grant.put("roomJoin", true);
    grant.put("room", room);
    grant.put("canPublish", true);
    grant.put("canSubscribe", true);
    grant.put("canPublishData", true);

    JWTClaimsSet claims = new JWTClaimsSet.Builder()
        .issuer(apiKey)                 // LiveKit finds the key by `iss`
        .subject(identity)              // the account id
        .issueTime(Date.from(now))
        .notBeforeTime(Date.from(now))
        .expirationTime(Date.from(now.plusSeconds(ttlSeconds)))
        .claim("name", name)
        .claim("video", grant)          // <-- the room grant
        .build();

    SignedJWT jwt = new SignedJWT(
        new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(),
        claims);
    jwt.sign(signer);                   // signer = MACSigner(apiSecret)
    return jwt.serialize();
}
```

**(d) Issuing it on join** — `consultation/application/ConsultationService.java`.
We verify the caller really is a participant, create/reuse the room, then mint:
```java
public JoinResponse join(UUID accountId, UUID appointmentId) {
    Appointment appt = appointments.findById(appointmentId).orElseThrow(...);
    Side side = sideOf(accountId, appt);     // 404s if caller isn't in this appt

    Consultation c = consultations.findByAppointmentId(appointmentId).orElseGet(() -> {
        Consultation nc = new Consultation();
        nc.setAppointment(appt);
        nc.setRoomName("consult-" + appointmentId);  // room name = the consult
        nc.setStatus(Consultation.Status.ACTIVE);
        return consultations.save(nc);
    });

    String token = livekit.mint(c.getRoomName(), accountId.toString(),
                                side.selfName, TOKEN_TTL_SECONDS);
    return new JoinResponse(c.getId(), appt.getId(), c.getRoomName(),
        livekitUrl, token, /* identity, role, names, */ appt.getMode().name());
}
```

**(e) Connecting on the web** — `features/consultation/video-consultation-room.ts`.
The browser tries the advertised URL, then falls back to the same-origin `wss`
nginx proxy `/lk` (so a remote browser never hits a cross-origin/firewall issue):
```ts
private livekitCandidates(j: JoinResponse): string[] {
  const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  const sameOriginProxy = `${wsProto}://${window.location.host}/lk`;  // fallback
  // ... also tries j.livekitUrl with the host rewritten to the page host ...
  return [/* advertised */, sameOriginProxy];
}
// connect: new Room(); await room.connect(url, j.token);
//          await room.localParticipant.enableCameraAndMicrophone();
```

**(f) Connecting on mobile** — `mobile/lib/.../consultation_screen.dart` +
`mobile/lib/core/config.dart`. The phone can't reach the server's internal URL,
so we rebuild it from the API host — over HTTPS it uses the same `wss://host/lk`
proxy as the web:
```dart
final room = Room(roomOptions: RoomOptions(adaptiveStream: true, dynacast: true));
final url = AppConfig.livekitUrlFor(info.livekitUrl);  // -> wss://<host>:4443/lk
await room.connect(url, info.token);
await room.localParticipant?.setMicrophoneEnabled(true);
if (info.isVideo) await room.localParticipant?.setCameraEnabled(true);
```

**(g) The nginx proxy** that makes `wss://host/lk` work — `frontend/nginx.conf`:
```nginx
location ^~ /lk/ {
    proxy_pass          http://livekit:7880/;
    proxy_http_version  1.1;
    proxy_set_header    Upgrade    $http_upgrade;   # WebSocket upgrade
    proxy_set_header    Connection "upgrade";
    proxy_read_timeout  86400s;
}
```

### Why a token server at all? (likely question)
LiveKit doesn't know our users. **Our backend is the authority**: it checks the
caller is a participant of that appointment, then signs a short-lived token that
says exactly which room they may join and what they may do. The LiveKit server
trusts the token because it is signed with the shared API secret — so we never
expose the secret to the client, and a token can't be forged or reused for
another room.

### One-line summary for the defense
> "LiveKit is a self-hosted WebRTC media server. Our backend authenticates the
> user, then mints a short-lived signed JWT (a `video` grant for one room); the
> client connects to LiveKit with that token and publishes camera/mic. The
> backend only issues tokens — it never handles the media, which is encrypted
> end-to-end and relayed by LiveKit."

---

## Quick reference

| | MailHog | LiveKit |
|---|---|---|
| Role | Fake SMTP inbox (dev) | WebRTC media server (calls) |
| Ports | 1025 SMTP, 8025 UI | 7880 signalling, 50000–50100/udp media |
| Backend touchpoint | `JavaMailSender.send()` in `NotificationService` | `LivekitTokenService.mint()` → `ConsultationService.join()` |
| Client touchpoint | — (we just read the inbox) | `room.connect(url, token)` (web + mobile) |
| Auth | none (dev only) | HS256 JWT signed with the API secret |
| Production swap | real SMTP host/port | managed LiveKit Cloud or the same server behind TLS |
