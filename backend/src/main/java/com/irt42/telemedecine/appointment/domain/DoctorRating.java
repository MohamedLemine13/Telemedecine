package com.irt42.telemedecine.appointment.domain;

import com.irt42.telemedecine.common.BaseEntity;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** A patient's 1–5 star rating of a doctor, one per completed appointment. */
@Entity
@Table(name = "doctor_rating")
@Getter
@Setter
@NoArgsConstructor
public class DoctorRating extends BaseEntity {

    @Column(name = "appointment_id", nullable = false, unique = true)
    private UUID appointmentId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "stars", nullable = false)
    private int stars;

    @Column(name = "comment", length = 1000)
    private String comment;
}
