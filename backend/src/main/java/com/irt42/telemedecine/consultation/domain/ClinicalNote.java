package com.irt42.telemedecine.consultation.domain;

import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Doctor-only private note for a consultation, autosaved while the call runs. */
@Entity
@Table(name = "clinical_note")
@Getter
@Setter
@NoArgsConstructor
public class ClinicalNote extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultation_id", nullable = false, unique = true)
    private Consultation consultation;

    @Column(name = "body", columnDefinition = "TEXT")
    private String body;
}
