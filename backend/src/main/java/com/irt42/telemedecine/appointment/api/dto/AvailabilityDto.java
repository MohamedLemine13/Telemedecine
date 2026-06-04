package com.irt42.telemedecine.appointment.api.dto;

import com.irt42.telemedecine.appointment.domain.DoctorAvailability;

import java.time.LocalTime;
import java.util.UUID;

public record AvailabilityDto(
    UUID id,
    int dayOfWeek,        // 1 = Monday … 7 = Sunday
    LocalTime startTime,
    LocalTime endTime,
    int slotMinutes
) {
    public static AvailabilityDto from(DoctorAvailability a) {
        return new AvailabilityDto(
            a.getId(),
            a.getDayOfWeek(),
            a.getStartTime(),
            a.getEndTime(),
            a.getSlotMinutes()
        );
    }
}
