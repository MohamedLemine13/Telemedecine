package com.irt42.telemedecine.doctor.api.dto;

import com.irt42.telemedecine.doctor.domain.DoctorProfile;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

public record DoctorProfileDto(
    UUID id,
    String email,
    String firstName,
    String lastName,
    String title,
    String bio,
    BigDecimal consultationFee,
    String currency,
    BigDecimal ratingAverage,
    int ratingCount,
    boolean verified,
    List<SpecialtyDto> specialties,
    List<String> languages,
    List<CredentialDto> credentials
) {
    public static DoctorProfileDto from(DoctorProfile d) {
        return new DoctorProfileDto(
            d.getId(),
            d.getAccount().getEmail(),
            d.getFirstName(),
            d.getLastName(),
            d.getTitle(),
            d.getBio(),
            d.getConsultationFee(),
            d.getCurrency(),
            d.getRatingAverage(),
            d.getRatingCount(),
            d.isVerified(),
            d.getSpecialties().stream().map(SpecialtyDto::from).toList(),
            d.getLanguages().stream().sorted().toList(),
            d.getCredentials().stream().map(CredentialDto::from).toList()
        );
    }

    /** Public-search view: drops bio + credentials. */
    public static DoctorProfileDto publicView(DoctorProfile d) {
        return new DoctorProfileDto(
            d.getId(),
            null,
            d.getFirstName(),
            d.getLastName(),
            d.getTitle(),
            d.getBio(),
            d.getConsultationFee(),
            d.getCurrency(),
            d.getRatingAverage(),
            d.getRatingCount(),
            d.isVerified(),
            d.getSpecialties().stream().map(SpecialtyDto::from).toList(),
            d.getLanguages().stream().sorted().toList(),
            List.of()
        );
    }
}
