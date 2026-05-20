package com.irt42.telemedecine.auth.domain;

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

import java.time.Instant;
import java.util.UUID;

/**
 * Persistable opaque refresh token. Stores only the SHA-256 hash of the
 * token (never the plaintext) — the plaintext is shown to the client once
 * at issuance.
 *
 * <p>Rotation: when used, this row's {@code revokedAt} is set and a new row
 * is inserted; the chain is recorded via {@code replacedById}. Detection of
 * a re-used revoked token signals theft → cascade-revoke the whole chain.
 */
@Entity
@Table(name = "refresh_token")
@Getter
@Setter
@NoArgsConstructor
public class RefreshToken extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Column(name = "token_hash", nullable = false, unique = true, length = 128)
    private String tokenHash;

    @Column(name = "issued_at", nullable = false)
    private Instant issuedAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    @Column(name = "replaced_by_id")
    private UUID replacedById;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "ip", length = 45)
    private String ip;

    public boolean isActive(Instant now) {
        return revokedAt == null && now.isBefore(expiresAt);
    }
}
