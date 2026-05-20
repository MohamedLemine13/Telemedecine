package com.irt42.telemedecine.auth.domain;

import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.HashSet;
import java.util.Set;

/**
 * A login identity. Roles are joined via the account_role link table (seeded
 * by V1__init.sql with the three role rows).
 *
 * <p>Phone number, name, etc. live on the patient / doctor profile tables that
 * land in Phase 2; the auth module deliberately keeps only what's required to
 * authenticate.
 */
@Entity
@Table(name = "account")
@Getter
@Setter
@NoArgsConstructor
public class Account extends BaseEntity {

    @Column(name = "email", nullable = false, unique = true, length = 320)
    private String email;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified;

    @Column(name = "phone", length = 32)
    private String phone;

    @Column(name = "password_hash", length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private AccountStatus status = AccountStatus.PENDING_VERIFICATION;

    @Column(name = "tfa_enabled", nullable = false)
    private boolean tfaEnabled;

    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(
        name = "account_role",
        joinColumns = @JoinColumn(name = "account_id"),
        inverseJoinColumns = @JoinColumn(name = "role_id")
    )
    private Set<Role> roles = new HashSet<>();
}
