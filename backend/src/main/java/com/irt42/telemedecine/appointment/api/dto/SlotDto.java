package com.irt42.telemedecine.appointment.api.dto;

import java.time.Instant;

/** A single bookable slot — UTC instants the frontend renders in clinic-local time. */
public record SlotDto(Instant startAt, Instant endAt) {}
