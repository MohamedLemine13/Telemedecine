package com.irt42.telemedecine.prescription.api.dto;

import com.irt42.telemedecine.prescription.domain.Prescription;

import java.time.Instant;
import java.util.UUID;

public record PrescriptionDto(
    UUID id,
    UUID appointmentId,
    String doctorName,
    String patientName,
    String title,
    String body,
    Instant issuedAt
) {
    public static PrescriptionDto from(Prescription p) {
        var d = p.getDoctor();
        var pt = p.getPatient();
        return new PrescriptionDto(
            p.getId(),
            p.getAppointmentId(),
            displayName(d.getTitle(), d.getFirstName(), d.getLastName(), d.getAccount().getEmail()),
            displayName(null, pt.getFirstName(), pt.getLastName(), pt.getAccount().getEmail()),
            p.getTitle(),
            p.getBody(),
            p.getIssuedAt()
        );
    }

    private static String displayName(String title, String first, String last, String fallback) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) sb.append(title).append(' ');
        if (first != null && !first.isBlank()) sb.append(first).append(' ');
        if (last != null && !last.isBlank()) sb.append(last);
        String name = sb.toString().trim();
        return name.isEmpty() ? fallback : name;
    }
}
