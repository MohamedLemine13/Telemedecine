package com.irt42.telemedecine.auth.domain;

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

import java.time.Instant;

/**
 * Short-lived email / SMS one-time code. Used for three purposes:
 *   LOGIN_2FA           — fallback when the user hasn't enrolled a TOTP
 *   EMAIL_VERIFICATION  — first sign-up flow
 *   PASSWORD_RESET      — paired with a {@link PasswordResetToken}; here the
 *                         OTP is the link-equivalent for SMS-only users
 *
 * Stored as a SHA-256 hash; never the plaintext.
 */
@Entity
@Table(name = "email_otp")
@Getter
@Setter
@NoArgsConstructor
public class EmailOtp extends BaseEntity {

    public enum Purpose { LOGIN_2FA, EMAIL_VERIFICATION, PASSWORD_RESET }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "account_id", nullable = false)
    private Account account;

    @Enumerated(EnumType.STRING)
    @Column(name = "purpose", nullable = false, length = 32)
    private Purpose purpose;

    @Column(name = "code_hash", nullable = false, length = 128)
    private String codeHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "consumed_at")
    private Instant consumedAt;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;
}
