package com.irt42.telemedecine.admin;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.AccountStatus;
import com.irt42.telemedecine.auth.domain.RoleCode;
import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.auth.infrastructure.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Dev/test seeder: ensures an admin account exists at startup so the
 * verification-workflow can be exercised end-to-end. Inert in prod
 * (admins must be provisioned through a controlled process there).
 */
@Component
@Profile({"dev", "test"})
public class AdminBootstrap {

    private static final Logger log = LoggerFactory.getLogger(AdminBootstrap.class);

    private final AccountRepository accounts;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;
    private final String email;
    private final String password;

    public AdminBootstrap(AccountRepository accounts,
                          RoleRepository roles,
                          PasswordEncoder passwordEncoder,
                          @Value("${telemedecine.admin.seed-email:admin@telemed.local}") String email,
                          @Value("${telemedecine.admin.seed-password:Admin@1234567}") String password) {
        this.accounts = accounts;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
        this.email = email;
        this.password = password;
    }

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seed() {
        if (accounts.existsByEmailIgnoreCase(email)) {
            log.info("Admin seed: account already exists for {}", email);
            return;
        }
        var adminRole = roles.findByCode(RoleCode.ROLE_ADMIN).orElseThrow();
        Account a = new Account();
        a.setEmail(email);
        a.setEmailVerified(true);
        a.setPasswordHash(passwordEncoder.encode(password));
        a.setStatus(AccountStatus.ACTIVE);
        a.setTfaEnabled(false);
        a.getRoles().add(adminRole);
        accounts.save(a);
        log.warn("Admin seed: created {} (dev/test only). Change password in production.", email);
    }
}
