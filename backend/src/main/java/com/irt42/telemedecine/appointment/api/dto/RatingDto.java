package com.irt42.telemedecine.appointment.api.dto;

import java.math.BigDecimal;

/** Doctor's rating summary after a new rating is recorded. */
public record RatingDto(BigDecimal ratingAverage, int ratingCount) {}
