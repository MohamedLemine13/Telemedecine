package com.irt42.telemedecine.auth.application;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.RefreshToken;
import com.irt42.telemedecine.auth.infrastructure.RefreshTokenRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Lifecycle of opaque refresh tokens.
 *
 *  <ul>
 *   <li>{@link #issue(Account)} — create a new active token.</li>
 *   <li>{@link #rotate(String)}  — exchange an active token for a fresh one;
 *       the old token is revoked and {@code replacedById} chains them.</li>
 *   <li>{@link #revoke(String)}  — sign-out from this device.</li>
 *  </ul>
 *
 * Plaintext tokens are never persisted — only their SHA-256 hash.
 */
@Service
public class RefreshTokenService {

    public record IssuedToken(String plaintext, RefreshToken record) {}

    private static final int TOKEN_BYTES = 32; // 256 bits

    private final RefreshTokenRepository repo;
    private final JwtProperties props;
    private final SecureRandom random = new SecureRandom();

    public RefreshTokenService(RefreshTokenRepository repo, JwtProperties props) {
        this.repo = repo;
        this.props = props;
    }

    @Transactional
    public IssuedToken issue(Account account) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(props.refreshTtlSeconds());

        String plaintext = generatePlaintext();
        RefreshToken row = new RefreshToken();
        row.setAccount(account);
        row.setTokenHash(hash(plaintext));
        row.setIssuedAt(now);
        row.setExpiresAt(expiry);
        repo.save(row);
        return new IssuedToken(plaintext, row);
    }

    /**
     * Rotation: validate the presented plaintext, revoke its row, mint a new
     * row chained to it. Returns {@link Optional#empty()} when the token is
     * unknown, expired, or already revoked.
     */
    @Transactional
    public Optional<IssuedToken> rotate(String plaintext) {
        Instant now = Instant.now();
        Optional<RefreshToken> maybe = repo.findByTokenHash(hash(plaintext));
        if (maybe.isEmpty() || !maybe.get().isActive(now)) {
            // Re-using a revoked token = potential theft → cascade-revoke the chain.
            maybe.ifPresent(t -> repo.revokeAllActive(t.getAccount(), now));
            return Optional.empty();
        }
        RefreshToken old = maybe.get();
        IssuedToken next = issue(old.getAccount());
        old.setRevokedAt(now);
        old.setReplacedById(next.record().getId());
        return Optional.of(next);
    }

    @Transactional
    public void revoke(String plaintext) {
        repo.findByTokenHash(hash(plaintext)).ifPresent(t -> t.setRevokedAt(Instant.now()));
    }

    @Transactional
    public int revokeAll(Account account) {
        return repo.revokeAllActive(account, Instant.now());
    }

    private String generatePlaintext() {
        byte[] bytes = new byte[TOKEN_BYTES];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    static String hash(String plaintext) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(plaintext.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
