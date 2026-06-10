package com.irt42.telemedecine.notification.api.dto;

import com.irt42.telemedecine.notification.domain.Notification;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
    UUID id,
    String type,
    String title,
    String body,
    String link,
    boolean read,
    Instant createdAt
) {
    public static NotificationDto from(Notification n) {
        return new NotificationDto(
            n.getId(), n.getType().name(), n.getTitle(), n.getBody(),
            n.getLink(), n.isRead(), n.getCreatedAt()
        );
    }
}
