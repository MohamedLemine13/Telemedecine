package com.irt42.telemedecine.doctor.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/** Pre-seeded lookup table (see V3__profiles.sql). */
@Entity
@Table(name = "specialty")
@Getter
@Setter
@NoArgsConstructor
public class Specialty {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    private UUID id;

    @Column(name = "code", nullable = false, unique = true, length = 64)
    private String code;

    @Column(name = "label_fr", nullable = false, length = 128)
    private String labelFr;

    @Column(name = "label_en", nullable = false, length = 128)
    private String labelEn;
}
