-- =============================================================================
-- V4__appointments.sql — doctor availability + appointment booking
-- =============================================================================
-- Phase 3. A doctor publishes weekly recurring availability blocks; the backend
-- expands those into concrete bookable slots and subtracts already-booked
-- appointments. Booking writes a row here; double-booking is prevented at the
-- database level by a partial unique index on (doctor_id, start_at).
-- =============================================================================

-- ─── Weekly recurring availability block ─────────────────────────────────────
-- One row = "every <weekday> from <start_time> to <end_time>, in <slot_minutes>
-- slices". A doctor may have several blocks per weekday (e.g. morning + evening).
CREATE TABLE doctor_availability (
    id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id     UUID         NOT NULL REFERENCES doctor_profile(id) ON DELETE CASCADE,
    -- ISO-8601 day-of-week: 1 = Monday … 7 = Sunday.
    day_of_week   SMALLINT     NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
    start_time    TIME         NOT NULL,
    end_time      TIME         NOT NULL,
    slot_minutes  INT          NOT NULL DEFAULT 30 CHECK (slot_minutes BETWEEN 5 AND 240),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version       BIGINT       NOT NULL DEFAULT 0,
    CHECK (end_time > start_time)
);
CREATE INDEX idx_doctor_availability_doctor ON doctor_availability(doctor_id);

-- ─── Appointment ─────────────────────────────────────────────────────────────
CREATE TABLE appointment (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id       UUID         NOT NULL REFERENCES doctor_profile(id)  ON DELETE CASCADE,
    patient_id      UUID         NOT NULL REFERENCES patient_profile(id) ON DELETE CASCADE,
    start_at        TIMESTAMPTZ  NOT NULL,
    end_at          TIMESTAMPTZ  NOT NULL,
    status          VARCHAR(16)  NOT NULL DEFAULT 'SCHEDULED'
                      CHECK (status IN ('SCHEDULED','CANCELLED','COMPLETED')),
    mode            VARCHAR(16)  NOT NULL DEFAULT 'VIDEO'
                      CHECK (mode IN ('VIDEO','PHONE')),
    reason          VARCHAR(500),
    cancel_reason   VARCHAR(500),
    cancelled_by    VARCHAR(16) CHECK (cancelled_by IS NULL OR cancelled_by IN ('PATIENT','DOCTOR')),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    version         BIGINT       NOT NULL DEFAULT 0,
    CHECK (end_at > start_at)
);
CREATE INDEX idx_appointment_doctor  ON appointment(doctor_id, start_at);
CREATE INDEX idx_appointment_patient ON appointment(patient_id, start_at);
CREATE INDEX idx_appointment_status  ON appointment(status);

-- A doctor can hold at most one live (non-cancelled) appointment per start time.
-- Partial index lets a cancelled slot be re-booked later.
CREATE UNIQUE INDEX uq_appointment_doctor_slot
    ON appointment(doctor_id, start_at)
    WHERE status <> 'CANCELLED';
