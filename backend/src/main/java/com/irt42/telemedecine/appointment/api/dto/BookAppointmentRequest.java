package com.irt42.telemedecine.appointment.api.dto;

import com.irt42.telemedecine.appointment.domain.Appointment;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.UUID;

public record BookAppointmentRequest(
    @NotNull UUID doctorId,
    @NotNull Instant startAt,
    Appointment.Mode mode,
    @Size(max = 500) String reason
) {}
