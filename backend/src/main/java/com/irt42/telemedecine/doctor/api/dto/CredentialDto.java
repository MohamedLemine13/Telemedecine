package com.irt42.telemedecine.doctor.api.dto;

import com.irt42.telemedecine.doctor.domain.Credential;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CredentialDto(
    UUID id,
    Credential.Kind kind,
    String issuer,
    LocalDate issuedOn,
    String documentName,
    String contentType,
    Long sizeBytes,
    Credential.Status status,
    Instant createdAt
) {
    public static CredentialDto from(Credential c) {
        return new CredentialDto(
            c.getId(), c.getKind(), c.getIssuer(), c.getIssuedOn(),
            c.getDocumentName(), c.getContentType(), c.getSizeBytes(),
            c.getStatus(), c.getCreatedAt()
        );
    }
}
