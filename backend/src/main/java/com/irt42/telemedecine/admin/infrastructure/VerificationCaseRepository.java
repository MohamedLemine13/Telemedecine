package com.irt42.telemedecine.admin.infrastructure;

import com.irt42.telemedecine.admin.domain.VerificationCase;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface VerificationCaseRepository extends JpaRepository<VerificationCase, UUID> {
    Optional<VerificationCase> findByDoctorId(UUID doctorId);
    Page<VerificationCase> findByStatus(VerificationCase.Status status, Pageable pageable);
    long countByStatus(VerificationCase.Status status);
}
