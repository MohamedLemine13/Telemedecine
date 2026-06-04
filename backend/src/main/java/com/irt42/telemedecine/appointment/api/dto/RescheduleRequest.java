package com.irt42.telemedecine.appointment.api.dto;

import jakarta.validation.constraints.NotNull;

import java.time.Instant;

public record RescheduleRequest(@NotNull Instant startAt) {}
