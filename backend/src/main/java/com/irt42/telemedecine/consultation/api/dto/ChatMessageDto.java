package com.irt42.telemedecine.consultation.api.dto;

import com.irt42.telemedecine.consultation.domain.ChatMessage;

import java.time.Instant;
import java.util.UUID;

public record ChatMessageDto(
    UUID id,
    UUID senderAccountId,
    String senderName,
    String senderRole,
    String body,
    Instant sentAt
) {
    public static ChatMessageDto from(ChatMessage m) {
        return new ChatMessageDto(
            m.getId(),
            m.getSenderAccountId(),
            m.getSenderName(),
            m.getSenderRole().name(),
            m.getBody(),
            m.getCreatedAt()
        );
    }
}
