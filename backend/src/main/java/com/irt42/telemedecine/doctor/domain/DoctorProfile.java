package com.irt42.telemedecine.doctor.domain;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "doctor_profile")
@Getter
@Setter
@NoArgsConstructor
public class DoctorProfile extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false, unique = true)
    private Account account;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "title", length = 32)
    private String title;

    @Column(name = "bio", columnDefinition = "TEXT")
    private String bio;

    @Column(name = "consultation_fee", precision = 10, scale = 2)
    private BigDecimal consultationFee;

    @Column(name = "currency", nullable = false, length = 8)
    private String currency = "MRU";

    @Column(name = "rating_average", precision = 3, scale = 2)
    private BigDecimal ratingAverage;

    @Column(name = "rating_count", nullable = false)
    private int ratingCount;

    @Column(name = "verified", nullable = false)
    private boolean verified;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "doctor_specialty",
        joinColumns = @JoinColumn(name = "doctor_id"),
        inverseJoinColumns = @JoinColumn(name = "specialty_id")
    )
    private Set<Specialty> specialties = new HashSet<>();

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "doctor_language", joinColumns = @JoinColumn(name = "doctor_id"))
    @Column(name = "language_tag", length = 16)
    private Set<String> languages = new HashSet<>();

    @OneToMany(mappedBy = "doctor", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt DESC")
    private List<Credential> credentials = new ArrayList<>();
}
