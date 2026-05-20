package com.irt42.telemedecine.doctor.api.dto;

import com.irt42.telemedecine.doctor.domain.Specialty;

import java.util.UUID;

public record SpecialtyDto(UUID id, String code, String labelFr, String labelEn) {
    public static SpecialtyDto from(Specialty s) {
        return new SpecialtyDto(s.getId(), s.getCode(), s.getLabelFr(), s.getLabelEn());
    }
}
