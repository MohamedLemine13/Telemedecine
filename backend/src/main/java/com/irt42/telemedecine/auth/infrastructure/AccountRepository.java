package com.irt42.telemedecine.auth.infrastructure;

import com.irt42.telemedecine.auth.domain.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Account, UUID> {
    Optional<Account> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
