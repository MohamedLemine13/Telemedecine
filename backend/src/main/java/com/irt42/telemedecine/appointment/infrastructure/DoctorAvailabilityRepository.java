package com.irt42.telemedecine.appointment.infrastructure;

import com.irt42.telemedecine.appointment.domain.DoctorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface DoctorAvailabilityRepository extends JpaRepository<DoctorAvailability, UUID> {

    List<DoctorAvailability> findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(UUID doctorId);

    void deleteByDoctorId(UUID doctorId);
}
