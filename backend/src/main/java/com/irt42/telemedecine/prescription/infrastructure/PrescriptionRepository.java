package com.irt42.telemedecine.prescription.infrastructure;

import com.irt42.telemedecine.prescription.domain.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, UUID> {
    List<Prescription> findByPatientAccountIdOrderByIssuedAtDesc(UUID accountId);
    List<Prescription> findByDoctorAccountIdOrderByIssuedAtDesc(UUID accountId);
}
