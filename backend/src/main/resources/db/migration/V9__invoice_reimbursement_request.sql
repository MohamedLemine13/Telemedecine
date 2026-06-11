-- Add the REIMBURSEMENT_REQUESTED state to the invoice status CHECK constraint.
ALTER TABLE invoice DROP CONSTRAINT IF EXISTS invoice_status_check;
ALTER TABLE invoice ADD CONSTRAINT invoice_status_check
    CHECK (status IN ('PENDING','PAID','REIMBURSEMENT_REQUESTED','REIMBURSED'));
