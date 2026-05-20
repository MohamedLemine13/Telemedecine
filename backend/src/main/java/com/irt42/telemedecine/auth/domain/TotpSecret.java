package com.irt42.telemedecine.auth.domain;

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

import java.time.Instant;

/**
 * Per-account TOTP enrollment. The secret is stored base32 here; Phase 2 will
 * wrap reading/writing in the PHI encryption converter.
 */
@Entity
@Table(name = "totp_secret")
@Getter
@Setter
@NoArgsConstructor
public class TotpSecret extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false, unique = true)
    private Account account;

    @Column(name = "secret", nullable = false, length = 64)
    private String secret;

    @Column(name = "enabled", nullable = false)
    private boolean enabled;

    @Column(name = "confirmed_at")
    private Instant confirmedAt;

    @Column(name = "last_used_at")
    private Instant lastUsedAt;
}
