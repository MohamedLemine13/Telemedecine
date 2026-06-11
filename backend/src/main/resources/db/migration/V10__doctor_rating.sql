-- Individual patient->doctor ratings (the aggregate lives on doctor_profile).
CREATE TABLE doctor_rating (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID        NOT NULL UNIQUE REFERENCES appointment(id)     ON DELETE CASCADE,
    doctor_id      UUID        NOT NULL REFERENCES doctor_profile(id)         ON DELETE CASCADE,
    patient_id     UUID        NOT NULL REFERENCES patient_profile(id)        ON DELETE CASCADE,
    stars          INTEGER     NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment        VARCHAR(1000),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version        BIGINT      NOT NULL DEFAULT 0
);
CREATE INDEX idx_doctor_rating_doctor ON doctor_rating(doctor_id);
