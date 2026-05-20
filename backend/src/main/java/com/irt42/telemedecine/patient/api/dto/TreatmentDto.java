package com.irt42.telemedecine.patient.api.dto;

import com.irt42.telemedecine.patient.domain.Treatment;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record TreatmentDto(
    UUID id,
    @NotBlank @Size(max = 255) String medication,
    @Size(max = 255) String dosage,
    @Size(max = 255) String frequency,
    LocalDate startedOn,
    LocalDate endedOn,
    String notes
) {
    public static TreatmentDto from(Treatment t) {
        return new TreatmentDto(
            t.getId(), t.getMedication(), t.getDosage(), t.getFrequency(),
            t.getStartedOn(), t.getEndedOn(), t.getNotes()
        );
    }
}
