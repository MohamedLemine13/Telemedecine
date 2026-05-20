package com.irt42.telemedecine.auth.infrastructure;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.EmailOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface EmailOtpRepository extends JpaRepository<EmailOtp, UUID> {

    List<EmailOtp> findByAccountAndPurposeAndConsumedAtIsNullAndExpiresAtAfter(
        Account account, EmailOtp.Purpose purpose, Instant now);

    long countByAccountAndPurposeAndCreatedAtAfter(
        Account account, EmailOtp.Purpose purpose, Instant since);
}
