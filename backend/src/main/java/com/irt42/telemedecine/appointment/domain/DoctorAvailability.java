package com.irt42.telemedecine.appointment.domain;

import com.irt42.telemedecine.common.BaseEntity;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.DayOfWeek;
import java.time.LocalTime;

/**
 * A weekly recurring availability block for a doctor: "every {@code dayOfWeek}
 * from {@code startTime} to {@code endTime}, sliced into {@code slotMinutes}
 * appointments". A doctor may have several blocks on the same weekday.
 */
@Entity
@Table(name = "doctor_availability")
@Getter
@Setter
@NoArgsConstructor
public class DoctorAvailability extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private DoctorProfile doctor;

    /** ISO-8601 day-of-week stored as 1 (Monday) … 7 (Sunday). */
    @Column(name = "day_of_week", nullable = false)
    private short dayOfWeek;

    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalTime endTime;

    @Column(name = "slot_minutes", nullable = false)
    private int slotMinutes = 30;

    public DayOfWeek dayOfWeekEnum() {
        return DayOfWeek.of(dayOfWeek);
    }

    public void setDayOfWeekEnum(DayOfWeek day) {
        this.dayOfWeek = (short) day.getValue();
    }
}
