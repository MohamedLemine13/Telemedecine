-- =============================================================================
-- V3__profiles.sql — patient + doctor profiles + credentials + verification
-- =============================================================================
-- Phase 2. Field-level encryption of PHI columns is deferred (planned for
-- Phase 2b); the columns marked PHI below will be encrypted at rest then.
-- =============================================================================

-- ─── Patient profile (1:1 with account when role contains ROLE_PATIENT) ──────
CREATE TABLE patient_profile (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      UUID         NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
    first_name      VARCHAR(100),
    last_name       VARCHAR(100),
    date_of_birth   DATE,
    gender          VARCHAR(16),
    -- PHI ▼
    medical_history TEXT,
    -- PHI ▲
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_patient_profile_account ON patient_profile(account_id);

CREATE TABLE allergy (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID         NOT NULL REFERENCES patient_profile(id) ON DELETE CASCADE,
    substance     VARCHAR(255) NOT NULL,
    severity      VARCHAR(32)
                    CHECK (severity IS NULL OR severity IN ('MILD','MODERATE','SEVERE','LIFE_THREATENING')),
    notes         TEXT,                                -- PHI
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_allergy_patient ON allergy(patient_id);

CREATE TABLE treatment (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID         NOT NULL REFERENCES patient_profile(id) ON DELETE CASCADE,
    medication    VARCHAR(255) NOT NULL,
    dosage        VARCHAR(255),
    frequency     VARCHAR(255),
    started_on    DATE,
    ended_on      DATE,
    notes         TEXT,                                -- PHI
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_treatment_patient ON treatment(patient_id);

CREATE TABLE lab_result (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id    UUID         NOT NULL REFERENCES patient_profile(id) ON DELETE CASCADE,
    label         VARCHAR(255) NOT NULL,
    performed_on  DATE,
    result_value  VARCHAR(255),
    unit          VARCHAR(32),
    notes         TEXT,                                -- PHI
    document_url  VARCHAR(2048),                       -- S3 object key
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_lab_result_patient ON lab_result(patient_id);

-- ─── Specialty lookup ───────────────────────────────────────────────────────
CREATE TABLE specialty (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    code          VARCHAR(64)  NOT NULL UNIQUE,
    label_fr      VARCHAR(128) NOT NULL,
    label_en      VARCHAR(128) NOT NULL
);
INSERT INTO specialty(code,label_fr,label_en) VALUES
    ('GENERAL_PRACTICE',  'Médecine générale',  'General practice'),
    ('CARDIOLOGY',        'Cardiologie',        'Cardiology'),
    ('DERMATOLOGY',       'Dermatologie',       'Dermatology'),
    ('PEDIATRICS',        'Pédiatrie',          'Pediatrics'),
    ('PSYCHIATRY',        'Psychiatrie',        'Psychiatry'),
    ('GYNECOLOGY',        'Gynécologie',        'Gynecology'),
    ('OPHTHALMOLOGY',     'Ophtalmologie',      'Ophthalmology'),
    ('NEUROLOGY',         'Neurologie',         'Neurology'),
    ('ORTHOPEDICS',       'Orthopédie',         'Orthopedics'),
    ('ENDOCRINOLOGY',     'Endocrinologie',     'Endocrinology');

-- ─── Doctor profile ──────────────────────────────────────────────────────────
CREATE TABLE doctor_profile (
    id                UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id        UUID         NOT NULL UNIQUE REFERENCES account(id) ON DELETE CASCADE,
    first_name        VARCHAR(100),
    last_name         VARCHAR(100),
    title             VARCHAR(32),
    bio               TEXT,
    consultation_fee  NUMERIC(10,2),
    currency          VARCHAR(8)  NOT NULL DEFAULT 'MRU',
    rating_average    NUMERIC(3,2),  -- 0.00 — 5.00
    rating_count      INT          NOT NULL DEFAULT 0,
    verified          BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version           BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_doctor_profile_verified ON doctor_profile(verified);
CREATE INDEX idx_doctor_profile_account  ON doctor_profile(account_id);

CREATE TABLE doctor_specialty (
    doctor_id    UUID NOT NULL REFERENCES doctor_profile(id) ON DELETE CASCADE,
    specialty_id UUID NOT NULL REFERENCES specialty(id)       ON DELETE RESTRICT,
    PRIMARY KEY (doctor_id, specialty_id)
);

CREATE TABLE doctor_language (
    doctor_id    UUID         NOT NULL REFERENCES doctor_profile(id) ON DELETE CASCADE,
    -- BCP-47 tags ("fr", "en", "ar", "fr-FR" …)
    language_tag VARCHAR(16)  NOT NULL,
    PRIMARY KEY (doctor_id, language_tag)
);

-- ─── Credentials (diplomas, board certifications, etc.) ──────────────────────
CREATE TABLE credential (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id       UUID         NOT NULL REFERENCES doctor_profile(id) ON DELETE CASCADE,
    kind            VARCHAR(32)  NOT NULL
                      CHECK (kind IN ('DIPLOMA','BOARD_CERT','LICENSE','OTHER')),
    issuer          VARCHAR(255),
    issued_on       DATE,
    document_key    VARCHAR(2048) NOT NULL,   -- S3 object key (private bucket telemed-credentials)
    document_name   VARCHAR(255),
    content_type    VARCHAR(128),
    size_bytes      BIGINT,
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_credential_doctor ON credential(doctor_id);
CREATE INDEX idx_credential_status ON credential(status);

-- ─── Verification case (admin workflow) ──────────────────────────────────────
CREATE TABLE verification_case (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id       UUID         NOT NULL UNIQUE REFERENCES doctor_profile(id) ON DELETE CASCADE,
    status          VARCHAR(16)  NOT NULL DEFAULT 'PENDING'
                      CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    reviewer_id     UUID         REFERENCES account(id) ON DELETE SET NULL,
    decision_note   TEXT,
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);
CREATE INDEX idx_verification_case_status ON verification_case(status);

COMMENT ON TABLE patient_profile   IS 'Phase 2 — PHI fields will move under field-level encryption in Phase 2b.';
COMMENT ON TABLE allergy           IS 'PHI: notes';
COMMENT ON TABLE treatment         IS 'PHI: notes';
COMMENT ON TABLE lab_result        IS 'PHI: notes, document_url';
