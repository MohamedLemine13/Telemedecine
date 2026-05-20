package com.irt42.telemedecine.auth.infrastructure;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.TotpSecret;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface TotpSecretRepository extends JpaRepository<TotpSecret, UUID> {
    Optional<TotpSecret> findByAccount(Account account);
}
