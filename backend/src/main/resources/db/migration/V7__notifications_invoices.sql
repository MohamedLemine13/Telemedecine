-- =============================================================================
-- V7__notifications_invoices.sql — in-app notifications + simulated billing
-- =============================================================================
-- Notifications: persisted per-account feed (web bell + mobile poll them);
-- email is a best-effort mirror sent through MailHog in dev.
-- Invoices: one per COMPLETED appointment, lazily reconciled on read. The
-- whole payment flow is simulated — see PaymentService.
-- =============================================================================

CREATE TABLE notification (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id  UUID         NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    type        VARCHAR(32)  NOT NULL DEFAULT 'SYSTEM'
                  CHECK (type IN ('ADMIN_MESSAGE','APPOINTMENT_BOOKED','APPOINTMENT_CANCELLED',
                                  'APPOINTMENT_RESCHEDULED','NEW_CHAT_MESSAGE','INVOICE_PAID','SYSTEM')),
    title       VARCHAR(200) NOT NULL,
    body        VARCHAR(2000),
    link        VARCHAR(300),
    read_flag   BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version     BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_notification_account ON notification(account_id, created_at DESC);
CREATE INDEX idx_notification_unread  ON notification(account_id) WHERE read_flag = FALSE;

CREATE TABLE invoice (
    id                   UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id       UUID          NOT NULL UNIQUE REFERENCES appointment(id) ON DELETE CASCADE,
    appointment_start_at TIMESTAMPTZ,
    doctor_id            UUID          NOT NULL REFERENCES doctor_profile(id)  ON DELETE CASCADE,
    patient_id           UUID          NOT NULL REFERENCES patient_profile(id) ON DELETE CASCADE,
    amount               NUMERIC(12,2) NOT NULL,
    currency             VARCHAR(8)    NOT NULL DEFAULT 'MRU',
    status               VARCHAR(16)   NOT NULL DEFAULT 'PENDING'
                           CHECK (status IN ('PENDING','PAID','REIMBURSED')),
    method               VARCHAR(32),
    paid_at              TIMESTAMPTZ,
    reimbursed_amount    NUMERIC(12,2),
    reimbursed_at        TIMESTAMPTZ,
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    version              BIGINT        NOT NULL DEFAULT 0
);
CREATE INDEX idx_invoice_patient ON invoice(patient_id, created_at DESC);
CREATE INDEX idx_invoice_doctor  ON invoice(doctor_id,  created_at DESC);
