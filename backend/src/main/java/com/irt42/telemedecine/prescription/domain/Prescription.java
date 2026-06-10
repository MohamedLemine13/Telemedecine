package com.irt42.telemedecine.prescription.domain;

import com.irt42.telemedecine.common.BaseEntity;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

/**
 * An e-prescription a doctor issues to a patient, usually right after (or
 * during) a consultation. The body is free text — one medication per line by
 * convention ("Amoxicilline 500mg — 3×/jour pendant 7 jours"). The linked
 * appointment is kept as a plain UUID so this module never needs the
 * appointment entity at read time.
 */
@Entity
@Table(name = "prescription")
@Getter
@Setter
@NoArgsConstructor
public class Prescription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "appointment_id")
    private UUID appointmentId;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", nullable = false, columnDefinition = "text")
    private String body;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;
}
