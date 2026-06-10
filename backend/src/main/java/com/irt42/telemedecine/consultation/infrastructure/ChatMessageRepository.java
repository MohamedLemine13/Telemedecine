package com.irt42.telemedecine.consultation.infrastructure;

import com.irt42.telemedecine.consultation.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findByConsultationIdOrderByCreatedAtAsc(UUID consultationId);
    Optional<ChatMessage> findFirstByConsultationIdOrderByCreatedAtDesc(UUID consultationId);
    long countByConsultationId(UUID consultationId);
}
