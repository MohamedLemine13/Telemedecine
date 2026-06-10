package com.irt42.telemedecine.prescription.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record IssuePrescriptionRequest(
    @NotNull UUID appointmentId,
    @NotBlank @Size(max = 200) String title,
    @NotBlank @Size(max = 8000) String body
) {}
