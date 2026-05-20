package com.irt42.telemedecine.patient.api.dto;

import com.irt42.telemedecine.patient.domain.PatientProfile;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record PatientProfileDto(
    UUID id,
    String email,
    String firstName,
    String lastName,
    LocalDate dateOfBirth,
    PatientProfile.Gender gender,
    String medicalHistory,
    List<AllergyDto> allergies,
    List<TreatmentDto> treatments,
    List<LabResultDto> labResults
) {
    public static PatientProfileDto from(PatientProfile p) {
        return new PatientProfileDto(
            p.getId(),
            p.getAccount().getEmail(),
            p.getFirstName(),
            p.getLastName(),
            p.getDateOfBirth(),
            p.getGender(),
            p.getMedicalHistory(),
            p.getAllergies().stream().map(AllergyDto::from).toList(),
            p.getTreatments().stream().map(TreatmentDto::from).toList(),
            p.getLabResults().stream().map(LabResultDto::from).toList()
        );
    }
}
