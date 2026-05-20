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
@Table(name = "lab_result")
@Getter
@Setter
@NoArgsConstructor
public class LabResult extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private PatientProfile patient;

    @Column(name = "label", nullable = false, length = 255)
    private String label;

    @Column(name = "performed_on")
    private LocalDate performedOn;

    @Column(name = "result_value", length = 255)
    private String resultValue;

    @Column(name = "unit", length = 32)
    private String unit;

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    @Column(name = "document_url", length = 2048)
    private String documentUrl;
}
