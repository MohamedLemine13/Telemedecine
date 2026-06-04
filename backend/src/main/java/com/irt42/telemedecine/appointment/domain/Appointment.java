package com.irt42.telemedecine.appointment.domain;

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

import java.time.Instant;

@Entity
@Table(name = "appointment")
@Getter
@Setter
@NoArgsConstructor
public class Appointment extends BaseEntity {

    public enum Status { SCHEDULED, CANCELLED, COMPLETED }
    public enum Mode { VIDEO, PHONE }
    public enum Party { PATIENT, DOCTOR }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "start_at", nullable = false)
    private Instant startAt;

    @Column(name = "end_at", nullable = false)
    private Instant endAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.SCHEDULED;

    @Enumerated(EnumType.STRING)
    @Column(name = "mode", nullable = false, length = 16)
    private Mode mode = Mode.VIDEO;

    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    @Enumerated(EnumType.STRING)
    @Column(name = "cancelled_by", length = 16)
    private Party cancelledBy;
}
