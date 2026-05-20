package com.irt42.telemedecine.admin.domain;

import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * Admin workflow row: tracks a doctor's verification request from initial
 * credential upload through approve / reject. Created (or refreshed back to
 * PENDING) by the listener on {@link com.irt42.telemedecine.doctor.events.CredentialUploadedEvent}.
 *
 * <p>doctor_id and reviewer_id are deliberately kept as UUIDs (not @ManyToOne)
 * to preserve module-boundary cleanliness — the admin module doesn't import
 * doctor or auth domain types.
 */
@Entity
@Table(name = "verification_case")
@Getter
@Setter
@NoArgsConstructor
public class VerificationCase extends BaseEntity {

    public enum Status { PENDING, APPROVED, REJECTED }

    @Column(name = "doctor_id", nullable = false, unique = true)
    private UUID doctorId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.PENDING;

    @Column(name = "reviewer_id")
    private UUID reviewerId;

    @Column(name = "decision_note", columnDefinition = "TEXT")
    private String decisionNote;

    @Column(name = "decided_at")
    private Instant decidedAt;
}
