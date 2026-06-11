package com.irt42.telemedecine.appointment.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record RateRequest(
    @NotNull UUID appointmentId,
    @Min(1) @Max(5) int stars,
    @Size(max = 1000) String comment
) {}
