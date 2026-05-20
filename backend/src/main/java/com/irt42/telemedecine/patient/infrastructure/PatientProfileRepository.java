package com.irt42.telemedecine.patient.infrastructure;

import com.irt42.telemedecine.patient.domain.PatientProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PatientProfileRepository extends JpaRepository<PatientProfile, UUID> {
    Optional<PatientProfile> findByAccountId(UUID accountId);
}
