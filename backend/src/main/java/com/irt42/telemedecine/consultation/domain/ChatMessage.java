package com.irt42.telemedecine.consultation.domain;

import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "chat_message")
@Getter
@Setter
@NoArgsConstructor
public class ChatMessage extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "consultation_id", nullable = false)
    private Consultation consultation;

    @Column(name = "sender_account_id", nullable = false)
    private UUID senderAccountId;

    @Column(name = "sender_name", length = 200)
    private String senderName;

    @Enumerated(EnumType.STRING)
    @Column(name = "sender_role", nullable = false, length = 16)
    private Appointment.Party senderRole;

    @Column(name = "body", nullable = false, length = 4000)
    private String body;
}
