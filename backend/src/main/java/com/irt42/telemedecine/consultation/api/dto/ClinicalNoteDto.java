package com.irt42.telemedecine.consultation.api.dto;

import com.irt42.telemedecine.consultation.domain.ClinicalNote;

import java.time.Instant;

public record ClinicalNoteDto(String body, Instant updatedAt) {
    public static ClinicalNoteDto from(ClinicalNote n) {
        return new ClinicalNoteDto(n.getBody(), n.getUpdatedAt());
    }
}
