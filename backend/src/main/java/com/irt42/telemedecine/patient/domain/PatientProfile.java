package com.irt42.telemedecine.patient.domain;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "patient_profile")
@Getter
@Setter
@NoArgsConstructor
public class PatientProfile extends BaseEntity {

    public enum Gender { MALE, FEMALE, OTHER, UNDISCLOSED }

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false, unique = true)
    private Account account;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(name = "gender", length = 16)
    private Gender gender;

    @Column(name = "medical_history", columnDefinition = "TEXT")
    private String medicalHistory;

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private List<Allergy> allergies = new ArrayList<>();

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private List<Treatment> treatments = new ArrayList<>();

    @OneToMany(mappedBy = "patient", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("performedOn DESC, createdAt DESC")
    private List<LabResult> labResults = new ArrayList<>();
}
