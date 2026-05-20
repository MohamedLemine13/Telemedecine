package com.irt42.telemedecine.doctor.infrastructure;

import com.irt42.telemedecine.doctor.domain.Specialty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SpecialtyRepository extends JpaRepository<Specialty, UUID> {
    Optional<Specialty> findByCode(String code);
}
