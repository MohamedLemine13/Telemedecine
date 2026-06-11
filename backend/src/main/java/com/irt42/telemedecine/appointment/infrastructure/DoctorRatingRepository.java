package com.irt42.telemedecine.appointment.infrastructure;

import com.irt42.telemedecine.appointment.domain.DoctorRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface DoctorRatingRepository extends JpaRepository<DoctorRating, UUID> {
    boolean existsByAppointmentId(UUID appointmentId);
}
