package com.irt42.telemedecine.payment.domain;

import com.irt42.telemedecine.common.BaseEntity;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * One invoice per completed appointment. The whole payment flow is *simulated*
 * (school project): "paying" just flips the status — no gateway is contacted —
 * and reimbursement credits a fixed percentage back, mimicking national health
 * insurance.
 */
@Entity
@Table(name = "invoice")
@Getter
@Setter
@NoArgsConstructor
public class Invoice extends BaseEntity {

    public enum Status { PENDING, PAID, REIMBURSED }

    @Column(name = "appointment_id", nullable = false, unique = true)
    private UUID appointmentId;

    /** Denormalised from the appointment so invoice lists render in one query. */
    @Column(name = "appointment_start_at")
    private Instant appointmentStartAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 8)
    private String currency = "MRU";

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.PENDING;

    /** Simulated payment method chosen by the patient (MOCK_CARD, MOCK_MOBILE_MONEY). */
    @Column(name = "method", length = 32)
    private String method;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "reimbursed_amount", precision = 12, scale = 2)
    private BigDecimal reimbursedAmount;

    @Column(name = "reimbursed_at")
    private Instant reimbursedAt;
}
