# Telemedecine

A telemedicine platform with three role-spaces — patient, doctor, and administrator — built as an Angular 21 frontend and a Spring Boot 3 backend.

**This is a school project**, so it favours clarity and a working demo flow over production hardening: BCrypt for passwords (no Argon2id / KMS), local-disk storage for uploaded files (no S3 / MinIO), synchronous audit writes, etc.

> See [`/home/tmort/.claude/plans/i-ve-created-a-design-temporal-hennessy.md`](.claude/plans) for the full plan.

---

## Repository layout

```
.
├── frontend/        Angular 21.2 + Tailwind 4 (Vitest)
├── backend/         Spring Boot 3.5 + Java 21 (Maven)
├── design/          Figma exports — source of truth for visual design
├── infra/           Docker, LiveKit, Postgres init scripts
├── DESIGN.md        Persistent design-system reference
└── SECURITY.md      Threat model + notes on what's deliberately simplified
```

---

## Prerequisites

| Tool | Notes |
|---|---|
| Docker | with Docker Compose v2 (`docker compose …`) |

Everything else (Java 21, Node 20, Maven, npm) runs **inside containers**.

---

## Run everything (one command)

```sh
cp .env.example .env
docker compose up -d --build
```

Once everything is healthy:

| URL | What |
|---|---|
| <http://localhost:4200> | The app — Angular SPA |
| <http://localhost:4200/swagger-ui.html> | Swagger UI (proxied) |
| <http://localhost:8080/swagger-ui.html> | Swagger UI (direct) |
| <http://localhost:8025> | MailHog — captured outbound email |
| `ws://localhost:7880` | LiveKit signalling (used by Phase 4) |

### Seeded admin account

The backend creates an admin on first start (dev/test profiles only):

| Field | Value |
|---|---|
| Email | `admin@telemed.local` |
| Password | `Admin@1234567` |

Sign in at <http://localhost:4200/auth/login>.

### Common compose commands

```sh
docker compose logs -f backend       # tail backend logs
docker compose ps                    # see service health
docker compose up -d --build backend # after backend code changes
docker compose down                  # stop, keep DB + uploads
docker compose down -v               # stop AND wipe data (incl. credentials on disk)
```

---

## Demo flow (school-project happy path)

1. Open <http://localhost:4200> → redirects to `/auth/login`.
2. Click "Create an account" → sign up as **a doctor**. You land on the doctor dashboard with a "Profile pending verification" banner.
3. Open **Profile** in the sidebar. Fill in name, specialties, languages, and **upload a credential** (any PDF / image up to 10 MB).
4. Sign out, then sign in as `admin@telemed.local` / `Admin@1234567`.
5. Open **Verifications**. Click the doctor's case. Download their credential (opens in a new tab), then **Approve**.
6. Sign out, sign up as **a patient**. Open **Find a doctor**. The verified doctor now appears in search.
7. Open **Medical record** → add an allergy, treatment, or lab result.

---

## Architecture

- **Frontend**: Angular 21 (standalone components, Signals), Tailwind 4 (`@theme` tokens), Vitest. Served by nginx in Docker with `/api/*`, `/ws/*`, `/v3/api-docs`, `/swagger-ui*`, `/actuator/*` proxied to the backend container.
- **Backend**: Spring Boot 3.5, modular monolith under `com.irt42.telemedecine.*` with bounded-context packages (auth / patient / doctor / admin / storage). PostgreSQL 16 + Flyway. Spring Security 6 + JWT + TOTP for 2FA.
- **File storage**: local disk under `/app/uploads`, mounted as a Docker volume. See `LocalFileStorage`.
- **Payments** (Phase 5): will be simulated — no real Stripe.

Full design system: [`DESIGN.md`](DESIGN.md).
Security model + intentional simplifications: [`SECURITY.md`](SECURITY.md).

---

## License

TBD.
