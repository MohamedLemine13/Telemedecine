package com.irt42.telemedecine.admin.api.dto;

import com.irt42.telemedecine.admin.domain.VerificationCase;
import com.irt42.telemedecine.doctor.api.dto.DoctorProfileDto;

import java.time.Instant;
import java.util.UUID;

public record VerificationCaseDto(
    UUID id,
    UUID doctorId,
    DoctorProfileDto doctor,
    VerificationCase.Status status,
    UUID reviewerId,
    String decisionNote,
    Instant decidedAt,
    Instant createdAt,
    Instant updatedAt
) {
    public static VerificationCaseDto from(VerificationCase vc, DoctorProfileDto doctor) {
        return new VerificationCaseDto(
            vc.getId(), vc.getDoctorId(), doctor,
            vc.getStatus(), vc.getReviewerId(), vc.getDecisionNote(), vc.getDecidedAt(),
            vc.getCreatedAt(), vc.getUpdatedAt()
        );
    }
}
