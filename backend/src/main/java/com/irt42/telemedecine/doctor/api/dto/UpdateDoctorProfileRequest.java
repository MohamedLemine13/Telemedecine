package com.irt42.telemedecine.doctor.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Set;

public record UpdateDoctorProfileRequest(
    @Size(max = 100) String firstName,
    @Size(max = 100) String lastName,
    @Size(max = 32)  String title,
    String bio,
    @DecimalMin("0") BigDecimal consultationFee,
    @Size(max = 8)   String currency,
    /** Specialty codes — see V3__profiles.sql for the seed list. */
    Set<String> specialties,
    /** BCP-47 tags ("fr", "en", "ar"…). */
    Set<String> languages
) {}
