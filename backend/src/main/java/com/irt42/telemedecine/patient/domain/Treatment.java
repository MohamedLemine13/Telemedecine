package com.irt42.telemedecine.patient.domain;

import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Entity
@Table(name = "treatment")
@Getter
@Setter
@NoArgsConstructor
public class Treatment extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "medication", nullable = false, length = 255)
    private String medication;

    @Column(name = "dosage", length = 255)
    private String dosage;

    @Column(name = "frequency", length = 255)
    private String frequency;

    @Column(name = "started_on")
    private LocalDate startedOn;

    @Column(name = "ended_on")
    private LocalDate endedOn;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
