package com.irt42.telemedecine.consultation.domain;

import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

/** The live session attached to one appointment. Video runs through LiveKit. */
@Entity
@Table(name = "consultation")
@Getter
@Setter
@NoArgsConstructor
public class Consultation extends BaseEntity {

    public enum Status { ACTIVE, ENDED }

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "appointment_id", nullable = false, unique = true)
    private Appointment appointment;

    @Column(name = "room_name", nullable = false, length = 128)
    private String roomName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 16)
    private Status status = Status.ACTIVE;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;
}
