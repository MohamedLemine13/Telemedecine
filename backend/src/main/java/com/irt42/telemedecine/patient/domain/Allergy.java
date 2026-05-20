package com.irt42.telemedecine.patient.domain;

import com.irt42.telemedecine.common.BaseEntity;
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

@Entity
@Table(name = "allergy")
@Getter
@Setter
@NoArgsConstructor
public class Allergy extends BaseEntity {

    public enum Severity { MILD, MODERATE, SEVERE, LIFE_THREATENING }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "substance", nullable = false, length = 255)
    private String substance;

    @Enumerated(EnumType.STRING)
    @Column(name = "severity", length = 32)
    private Severity severity;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;
}
