package com.irt42.telemedecine.consultation.infrastructure;

import com.irt42.telemedecine.consultation.domain.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {
    Optional<Consultation> findByAppointmentId(UUID appointmentId);
}
