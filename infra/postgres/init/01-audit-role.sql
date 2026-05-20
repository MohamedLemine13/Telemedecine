-- Provisions the read/write business role and the INSERT-only audit role.
-- Runs once on first container start (mounted by docker-compose).

-- Resolve the application's DB role from the standard env var so the script
-- works whether DB_USER stays `telemed` or is overridden.
\set app_role `echo "$POSTGRES_USER"`

-- Audit role: can only INSERT into audit.* tables (no UPDATE/DELETE).
-- Application binds with the main DB user for normal traffic and with this
-- role for the AuditEventRepository.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'telemed_audit') THEN
    CREATE ROLE telemed_audit LOGIN PASSWORD 'change-me-audit';
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS audit AUTHORIZATION :"app_role";

GRANT USAGE ON SCHEMA audit TO telemed_audit;

-- Critical: ALTER DEFAULT PRIVILEGES applies to tables created by the role
-- named in FOR ROLE. Without this, Flyway tables (created as the app role)
-- would NOT inherit these grants.
ALTER DEFAULT PRIVILEGES FOR ROLE :"app_role" IN SCHEMA audit
  GRANT INSERT, SELECT ON TABLES TO telemed_audit;
ALTER DEFAULT PRIVILEGES FOR ROLE :"app_role" IN SCHEMA audit
  GRANT USAGE, SELECT ON SEQUENCES TO telemed_audit;
