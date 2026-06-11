package com.irt42.telemedecine.notification.domain;

import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * In-app notification for one account. The recipient is referenced by plain
 * UUID so this module stays decoupled from the auth module's entities — the
 * email side-channel resolves the address at send time.
 */
@Entity
@Table(name = "notification")
@Getter
@Setter
@NoArgsConstructor
public class Notification extends BaseEntity {

    public enum Type {
        ADMIN_MESSAGE,            // sent manually by an administrator
        APPOINTMENT_BOOKED,
        APPOINTMENT_CANCELLED,
        APPOINTMENT_RESCHEDULED,
        NEW_CHAT_MESSAGE,
        PRESCRIPTION_ISSUED,
        INVOICE_PAID,
        SYSTEM
    }

    @Column(name = "account_id", nullable = false)
    private UUID accountId;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 32)
    private Type type = Type.SYSTEM;

    @Column(name = "title", nullable = false, length = 200)
    private String title;

    @Column(name = "body", length = 2000)
    private String body;

    /** Optional deep-link the UI can navigate to (e.g. /patient/appointments). */
    @Column(name = "link", length = 300)
    private String link;

    @Column(name = "read_flag", nullable = false)
    private boolean read;
}
