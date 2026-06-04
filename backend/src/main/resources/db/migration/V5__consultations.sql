-- =============================================================================
-- V5__consultations.sql — live video consultation, chat, clinical notes
-- =============================================================================
-- Phase 4. A consultation is the live session attached to one appointment.
-- Video flows peer-to-peer through LiveKit (the backend only mints room tokens);
-- chat messages and the doctor's clinical note are persisted here.
-- =============================================================================

CREATE TABLE consultation (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id  UUID         NOT NULL UNIQUE REFERENCES appointment(id) ON DELETE CASCADE,
    room_name       VARCHAR(128) NOT NULL,
    status          VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE','ENDED')),
    started_at      TIMESTAMPTZ,
    ended_at        TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_consultation_appointment ON consultation(appointment_id);

-- In-call chat. Sender display fields are denormalised so the message list is a
-- single cheap query. School-project simplification: stored in plaintext (the
-- audit table is reserved for the field-level-encryption upgrade path).
CREATE TABLE chat_message (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id   UUID         NOT NULL REFERENCES consultation(id) ON DELETE CASCADE,
    sender_account_id UUID         NOT NULL,
    sender_name       VARCHAR(200),
    sender_role       VARCHAR(16)  NOT NULL CHECK (sender_role IN ('PATIENT','DOCTOR')),
    body              VARCHAR(4000) NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version           BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_chat_message_consult ON chat_message(consultation_id, created_at);

-- Doctor-only private note, one per consultation, autosaved while the call runs.
CREATE TABLE clinical_note (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID         NOT NULL UNIQUE REFERENCES consultation(id) ON DELETE CASCADE,
    body            TEXT,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);
