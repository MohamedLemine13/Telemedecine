package com.irt42.telemedecine.doctor.infrastructure;

import com.irt42.telemedecine.doctor.domain.Credential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CredentialRepository extends JpaRepository<Credential, UUID> {
}
