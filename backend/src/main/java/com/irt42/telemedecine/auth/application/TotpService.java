package com.irt42.telemedecine.auth.application;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.TotpSecret;
import com.irt42.telemedecine.auth.infrastructure.TotpSecretRepository;
import dev.samstevens.totp.code.CodeGenerator;
import dev.samstevens.totp.code.CodeVerifier;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.DefaultCodeVerifier;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.secret.SecretGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.time.TimeProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

/**
 * TOTP enrollment (Phase-1 2FA).
 *
 * <ul>
 *  <li>{@link #beginEnrollment(Account)} — generate a fresh base32 secret and
 *      a provisioning URI ({@code otpauth://...}) the client renders as a
 *      QR code. The secret row is created in {@code enabled=false} state.</li>
 *  <li>{@link #confirmEnrollment(Account, String)} — verify the first code,
 *      flip {@code enabled=true} and set {@code Account.tfaEnabled}.</li>
 *  <li>{@link #verify(Account, String)} — used at login and on disable.</li>
 * </ul>
 */
@Service
public class TotpService {

    public record Enrollment(String secret, String provisioningUri) {}

    private static final int CODE_PERIOD_SECONDS = 30;
    private static final int CODE_TIME_DRIFT = 1; // ±1 step
    private static final String ISSUER = "Telemedecine";

    private final TotpSecretRepository totpRepo;
    private final SecretGenerator secretGenerator = new DefaultSecretGenerator();
    private final CodeGenerator codeGenerator = new DefaultCodeGenerator();
    private final TimeProvider timeProvider = new SystemTimeProvider();
    private final CodeVerifier verifier;

    public TotpService(TotpSecretRepository totpRepo) {
        this.totpRepo = totpRepo;
        DefaultCodeVerifier v = new DefaultCodeVerifier(codeGenerator, timeProvider);
        v.setTimePeriod(CODE_PERIOD_SECONDS);
        v.setAllowedTimePeriodDiscrepancy(CODE_TIME_DRIFT);
        this.verifier = v;
    }

    @Transactional
    public Enrollment beginEnrollment(Account account) {
        String secret = secretGenerator.generate();
        TotpSecret row = totpRepo.findByAccount(account).orElseGet(() -> {
            TotpSecret t = new TotpSecret();
            t.setAccount(account);
            return t;
        });
        row.setSecret(secret);
        row.setEnabled(false);
        row.setConfirmedAt(null);
        totpRepo.save(row);

        QrData data = new QrData.Builder()
            .label(account.getEmail())
            .secret(secret)
            .issuer(ISSUER)
            .algorithm(HashingAlgorithm.SHA1) // authenticator-app default
            .digits(6)
            .period(CODE_PERIOD_SECONDS)
            .build();

        return new Enrollment(secret, data.getUri());
    }

    @Transactional
    public boolean confirmEnrollment(Account account, String code) {
        Optional<TotpSecret> maybe = totpRepo.findByAccount(account);
        if (maybe.isEmpty()) return false;
        TotpSecret row = maybe.get();
        if (row.isEnabled()) return false; // already enrolled — refuse to re-confirm
        if (!verifier.isValidCode(row.getSecret(), code)) return false;

        row.setEnabled(true);
        row.setConfirmedAt(Instant.now());
        account.setTfaEnabled(true);
        return true;
    }

    /** Used at login and on disable. */
    public boolean verify(Account account, String code) {
        Optional<TotpSecret> maybe = totpRepo.findByAccount(account);
        if (maybe.isEmpty() || !maybe.get().isEnabled()) return false;
        boolean ok = verifier.isValidCode(maybe.get().getSecret(), code);
        if (ok) maybe.get().setLastUsedAt(Instant.now());
        return ok;
    }

    @Transactional
    public void disable(Account account) {
        totpRepo.findByAccount(account).ifPresent(totpRepo::delete);
        account.setTfaEnabled(false);
    }
}
