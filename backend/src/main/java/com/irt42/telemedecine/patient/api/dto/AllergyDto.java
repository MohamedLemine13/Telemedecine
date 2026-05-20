package com.irt42.telemedecine.patient.api.dto;

import com.irt42.telemedecine.patient.domain.Allergy;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AllergyDto(
    UUID id,
    @NotBlank @Size(max = 255) String substance,
    Allergy.Severity severity,
    String notes
) {
    public static AllergyDto from(Allergy a) {
        return new AllergyDto(a.getId(), a.getSubstance(), a.getSeverity(), a.getNotes());
    }
}
