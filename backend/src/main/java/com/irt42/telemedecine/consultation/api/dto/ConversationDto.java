package com.irt42.telemedecine.consultation.api.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * One row of the Messages screen: a past or ongoing consultation with the
 * counterpart's name and a preview of the last chat message.
 */
public record ConversationDto(
    UUID consultationId,
    UUID appointmentId,
    String counterpartName,
    String mode,             // VIDEO or PHONE
    String status,           // ACTIVE or ENDED
    Instant startedAt,
    Instant endedAt,
    String lastMessage,
    String lastMessageSender,
    Instant lastMessageAt,
    int messageCount
) {}
