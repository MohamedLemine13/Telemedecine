-- =============================================================================
-- V8__notification_prescription_type.sql — allow PRESCRIPTION_ISSUED notifications
-- =============================================================================
-- Patients now get an in-app notification when a doctor issues a prescription,
-- so the `notification.type` CHECK constraint must accept the new enum value.
-- Drop the auto-named inline check from V7 and recreate it with the value added.
-- =============================================================================

ALTER TABLE notification DROP CONSTRAINT IF EXISTS notification_type_check;

ALTER TABLE notification ADD CONSTRAINT notification_type_check
    CHECK (type IN ('ADMIN_MESSAGE','APPOINTMENT_BOOKED','APPOINTMENT_CANCELLED',
                    'APPOINTMENT_RESCHEDULED','NEW_CHAT_MESSAGE','PRESCRIPTION_ISSUED',
                    'INVOICE_PAID','SYSTEM'));
