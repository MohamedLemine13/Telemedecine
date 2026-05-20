package com.irt42.telemedecine.auth.infrastructure;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken t set t.revokedAt = :now " +
           "where t.account = :account and t.revokedAt is null")
    int revokeAllActive(@Param("account") Account account, @Param("now") Instant now);
}
