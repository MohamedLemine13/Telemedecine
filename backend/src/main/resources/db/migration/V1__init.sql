-- =============================================================================
-- V1__init.sql — baseline schema for the Telemedecine platform
-- =============================================================================
-- Conventions:
--   * UUID primary keys via pgcrypto's gen_random_uuid().
--   * Every business table has created_at, updated_at, version columns.
--   * Audit schema is append-only; an INSERT-only role is provisioned in
--     infra/postgres/init/01-audit-role.sql.
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE SCHEMA IF NOT EXISTS audit;

-- -----------------------------------------------------------------------------
-- Accounts & roles (auth module)
-- -----------------------------------------------------------------------------
CREATE TABLE account (
    id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    email            VARCHAR(320) NOT NULL UNIQUE,
    email_verified   BOOLEAN      NOT NULL DEFAULT FALSE,
    phone            VARCHAR(32),
    password_hash    VARCHAR(255),
    status           VARCHAR(32)  NOT NULL DEFAULT 'ACTIVE'
                       CHECK (status IN ('ACTIVE','SUSPENDED','PENDING_VERIFICATION','DELETED')),
    tfa_enabled      BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version          BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_account_status ON account(status);

CREATE TABLE role (
    id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code       VARCHAR(32)  NOT NULL UNIQUE
                  CHECK (code IN ('ROLE_PATIENT','ROLE_DOCTOR','ROLE_ADMIN')),
    label      VARCHAR(64)  NOT NULL
);
INSERT INTO role(code,label) VALUES
    ('ROLE_PATIENT','Patient'),
    ('ROLE_DOCTOR','Doctor'),
    ('ROLE_ADMIN','Administrator');

CREATE TABLE account_role (
    account_id  UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    role_id     UUID NOT NULL REFERENCES role(id)    ON DELETE RESTRICT,
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (account_id, role_id)
);

-- -----------------------------------------------------------------------------
-- Refresh tokens (auth module, Phase 1)
-- -----------------------------------------------------------------------------
CREATE TABLE refresh_token (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID        NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    token_hash      VARCHAR(128) NOT NULL UNIQUE,
    issued_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    revoked_at      TIMESTAMPTZ,
    replaced_by_id  UUID        REFERENCES refresh_token(id),
    user_agent      VARCHAR(512),
    ip              VARCHAR(45),  -- max IPv6 length, max IPv4 mapped is 15
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version         BIGINT      NOT NULL DEFAULT 0
);
CREATE INDEX idx_refresh_account ON refresh_token(account_id);
CREATE INDEX idx_refresh_expires ON refresh_token(expires_at);

-- -----------------------------------------------------------------------------
-- Email / SMS OTP (auth module, Phase 1)
-- -----------------------------------------------------------------------------
CREATE TABLE email_otp (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID         NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    purpose       VARCHAR(32)  NOT NULL
                    CHECK (purpose IN ('LOGIN_2FA','EMAIL_VERIFICATION','PASSWORD_RESET')),
    code_hash     VARCHAR(128) NOT NULL,
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    attempt_count INT          NOT NULL DEFAULT 0,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_email_otp_account ON email_otp(account_id);
CREATE INDEX idx_email_otp_expires ON email_otp(expires_at);

-- -----------------------------------------------------------------------------
-- ShedLock (cluster-safe @Scheduled)
-- -----------------------------------------------------------------------------
CREATE TABLE shedlock (
    name       VARCHAR(64)  NOT NULL PRIMARY KEY,
    lock_until TIMESTAMPTZ  NOT NULL,
    locked_at  TIMESTAMPTZ  NOT NULL,
    locked_by  VARCHAR(255) NOT NULL
);

-- -----------------------------------------------------------------------------
-- Audit log (append-only — INSERT-only role granted via init SQL)
-- -----------------------------------------------------------------------------
CREATE TABLE audit.audit_event (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    actor_id      UUID,
    actor_role    VARCHAR(32),
    action        VARCHAR(64)  NOT NULL,
    target_type   VARCHAR(64),
    target_id     UUID,
    request_id    VARCHAR(64),
    ip            VARCHAR(45),
    user_agent    VARCHAR(512),
    outcome       VARCHAR(16)  NOT NULL DEFAULT 'SUCCESS'
                    CHECK (outcome IN ('SUCCESS','DENIED','ERROR')),
    reason        TEXT,
    details_json  JSONB
);
CREATE INDEX idx_audit_event_actor    ON audit.audit_event(actor_id);
CREATE INDEX idx_audit_event_target   ON audit.audit_event(target_type, target_id);
CREATE INDEX idx_audit_event_occurred ON audit.audit_event(occurred_at);
CREATE INDEX idx_audit_event_action   ON audit.audit_event(action);

COMMENT ON SCHEMA audit IS 'Append-only audit trail. INSERT-only via telemed_audit role.';
