-- =============================================================================
-- V2__auth_2fa.sql — TOTP secrets + password-reset tokens (Phase 1 auth)
-- =============================================================================

-- One TOTP secret per account. Secret is the base32 seed used by the
-- authenticator app and verified server-side.
CREATE TABLE totp_secret (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID         NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
    secret        VARCHAR(64)  NOT NULL,           -- base32 seed (ENCRYPTED at rest in Phase 2)
    enabled       BOOLEAN      NOT NULL DEFAULT FALSE,
    confirmed_at  TIMESTAMPTZ,                     -- set when user first verifies a code
    last_used_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);

-- Single-use, time-bound password reset link.
CREATE TABLE password_reset_token (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id    UUID         NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    token_hash    VARCHAR(128) NOT NULL UNIQUE,
    issued_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    expires_at    TIMESTAMPTZ  NOT NULL,
    consumed_at   TIMESTAMPTZ,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_password_reset_account ON password_reset_token(account_id);
CREATE INDEX idx_password_reset_expires ON password_reset_token(expires_at);
