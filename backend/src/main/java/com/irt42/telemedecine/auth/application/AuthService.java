package com.irt42.telemedecine.auth.application;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.AccountStatus;
import com.irt42.telemedecine.auth.domain.Role;
import com.irt42.telemedecine.auth.domain.RoleCode;
import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.auth.infrastructure.RoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.UUID;

/**
 * Orchestrates the auth flows. Pure application service — controllers translate
 * HTTP, this layer talks domain.
 */
@Service
public class AuthService {

    public record Tokens(String accessToken, String refreshToken, long accessExpiresIn) {}

    public sealed interface LoginOutcome permits FullLogin, TfaChallenge {}
    public record FullLogin(Tokens tokens) implements LoginOutcome {}
    public record TfaChallenge(String challengeToken) implements LoginOutcome {}

    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwt;
    private final RefreshTokenService refreshTokens;
    private final TotpService totp;
    private final JwtProperties jwtProps;

    public AuthService(AccountRepository accounts,
                       RoleRepository roles,
                       PasswordEncoder passwordEncoder,
                       JwtService jwt,
                       RefreshTokenService refreshTokens,
                       TotpService totp,
                       JwtProperties jwtProps) {
        this.accounts = accounts;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.jwt = jwt;
        this.refreshTokens = refreshTokens;
        this.totp = totp;
        this.jwtProps = jwtProps;
    }

    @Transactional
    public Tokens signup(String email, String password, RoleCode role) {
        String normalized = email.trim().toLowerCase();
        if (accounts.existsByEmailIgnoreCase(normalized)) {
            throw new AuthErrors.EmailAlreadyRegistered(normalized);
        }
        // Admin self-signup is disallowed — admins are seeded server-side.
        if (role == RoleCode.ROLE_ADMIN) {
            throw new AuthErrors.UnknownRole(role.name());
        }
        Role roleRow = roles.findByCode(role).orElseThrow(() -> new AuthErrors.UnknownRole(role.name()));

        Account account = new Account();
        account.setEmail(normalized);
        account.setEmailVerified(false);
        account.setStatus(AccountStatus.ACTIVE); // simplified — email verification flow is Phase 1b
        account.setPasswordHash(passwordEncoder.encode(password));
        account.setTfaEnabled(false);
        account.getRoles().add(roleRow);
        accounts.save(account);

        return issueTokens(account);
    }

    @Transactional
    public LoginOutcome login(String email, String password) {
        Account account = accounts.findByEmailIgnoreCase(email.trim())
            .orElseThrow(AuthErrors.InvalidCredentials::new);
        if (account.getPasswordHash() == null
            || !passwordEncoder.matches(password, account.getPasswordHash())) {
            throw new AuthErrors.InvalidCredentials();
        }
        if (account.getStatus() != AccountStatus.ACTIVE
            && account.getStatus() != AccountStatus.PENDING_VERIFICATION) {
            throw new AuthErrors.AccountInactive(account.getStatus().name());
        }
        if (account.isTfaEnabled()) {
            return new TfaChallenge(jwt.issueTfaChallenge(account));
        }
        return new FullLogin(issueTokens(account));
    }

    @Transactional
    public Tokens verifyTfa(UUID accountId, String code) {
        Account account = accounts.findById(accountId).orElseThrow(AuthErrors.InvalidCredentials::new);
        if (!totp.verify(account, code)) {
            throw new AuthErrors.TfaCodeInvalid();
        }
        return issueTokens(account);
    }

    @Transactional
    public Tokens refresh(String refreshTokenPlaintext) {
        return refreshTokens.rotate(refreshTokenPlaintext)
            .map(t -> new Tokens(jwt.issueAccessToken(t.record().getAccount()),
                                  t.plaintext(),
                                  jwtProps.accessTtlSeconds()))
            .orElseThrow(AuthErrors.InvalidRefreshToken::new);
    }

    @Transactional
    public void logout(String refreshTokenPlaintext) {
        refreshTokens.revoke(refreshTokenPlaintext);
    }

    // ── 2FA enrollment ──────────────────────────────────────────────────────
    @Transactional
    public TotpService.Enrollment beginTfaEnrollment(UUID accountId) {
        Account account = accounts.findById(accountId).orElseThrow(AuthErrors.InvalidCredentials::new);
        if (account.isTfaEnabled()) {
            throw new AuthErrors.TfaAlreadyEnrolled();
        }
        return totp.beginEnrollment(account);
    }

    @Transactional
    public Tokens confirmTfaEnrollment(UUID accountId, String code) {
        Account account = accounts.findById(accountId).orElseThrow(AuthErrors.InvalidCredentials::new);
        if (!totp.confirmEnrollment(account, code)) {
            throw new AuthErrors.TfaCodeInvalid();
        }
        // Re-issue tokens so the access token now carries the new tfa state.
        // (Old refresh tokens stay valid — user keeps their session.)
        return new Tokens(jwt.issueAccessToken(account),
                          refreshTokens.issue(account).plaintext(),
                          jwtProps.accessTtlSeconds());
    }

    @Transactional
    public void disableTfa(UUID accountId, String code) {
        Account account = accounts.findById(accountId).orElseThrow(AuthErrors.InvalidCredentials::new);
        if (!account.isTfaEnabled()) {
            throw new AuthErrors.TfaNotEnrolled();
        }
        if (!totp.verify(account, code)) {
            throw new AuthErrors.TfaCodeInvalid();
        }
        totp.disable(account);
    }

    // ── Internal helpers ────────────────────────────────────────────────────
    private Tokens issueTokens(Account account) {
        return new Tokens(
            jwt.issueAccessToken(account),
            refreshTokens.issue(account).plaintext(),
            jwtProps.accessTtlSeconds()
        );
    }
}
