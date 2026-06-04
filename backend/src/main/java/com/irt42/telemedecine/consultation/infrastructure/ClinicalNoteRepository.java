package com.irt42.telemedecine.consultation.infrastructure;

import com.irt42.telemedecine.consultation.domain.ClinicalNote;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClinicalNoteRepository extends JpaRepository<ClinicalNote, UUID> {
    Optional<ClinicalNote> findByConsultationId(UUID consultationId);
}
