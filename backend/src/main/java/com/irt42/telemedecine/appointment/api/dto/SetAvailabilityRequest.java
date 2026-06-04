package com.irt42.telemedecine.appointment.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;
import java.util.List;

/**
 * Full replacement of a doctor's weekly availability. The list is the new,
 * complete set of blocks — any blocks not present are removed.
 */
public record SetAvailabilityRequest(
    @Valid @NotNull List<Block> blocks
) {
    public record Block(
        @Min(1) @Max(7) int dayOfWeek,          // 1 = Monday … 7 = Sunday
        @NotNull LocalTime startTime,
        @NotNull LocalTime endTime,
        @Min(5) @Max(240) int slotMinutes
    ) {}
}
