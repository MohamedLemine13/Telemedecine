package com.irt42.telemedecine.patient.api.dto;

import com.irt42.telemedecine.patient.domain.LabResult;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public record LabResultDto(
    UUID id,
    @NotBlank @Size(max = 255) String label,
    LocalDate performedOn,
    @Size(max = 255) String resultValue,
    @Size(max = 32) String unit,
    String notes,
    String documentUrl
) {
    public static LabResultDto from(LabResult r) {
        return new LabResultDto(
            r.getId(), r.getLabel(), r.getPerformedOn(),
            r.getResultValue(), r.getUnit(), r.getNotes(), r.getDocumentUrl()
        );
    }
}
