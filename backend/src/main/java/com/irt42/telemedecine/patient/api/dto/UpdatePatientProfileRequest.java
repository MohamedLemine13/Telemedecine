package com.irt42.telemedecine.patient.api.dto;

import com.irt42.telemedecine.patient.domain.PatientProfile;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdatePatientProfileRequest(
    @Size(max = 100) String firstName,
    @Size(max = 100) String lastName,
    LocalDate dateOfBirth,
    PatientProfile.Gender gender,
    String medicalHistory
) {}
