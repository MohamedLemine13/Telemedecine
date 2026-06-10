-- =============================================================================
-- V6__prescriptions.sql — e-prescriptions
-- =============================================================================
-- Phase 5 (first slice). A prescription is issued by a doctor against one of
-- their appointments; the body is free text, one medication per line by
-- convention. PDF rendering / pharmacy integration stay out of scope for the
-- school project — patients read prescriptions in-app.
-- =============================================================================

CREATE TABLE prescription (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id       UUID         NOT NULL REFERENCES doctor_profile(id)  ON DELETE CASCADE,
    patient_id      UUID         NOT NULL REFERENCES patient_profile(id) ON DELETE CASCADE,
    appointment_id  UUID         REFERENCES appointment(id) ON DELETE SET NULL,
    title           VARCHAR(200) NOT NULL,
    body            TEXT         NOT NULL,
    issued_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0
);

CREATE INDEX idx_prescription_patient ON prescription(patient_id, issued_at DESC);
CREATE INDEX idx_prescription_doctor  ON prescription(doctor_id,  issued_at DESC);
