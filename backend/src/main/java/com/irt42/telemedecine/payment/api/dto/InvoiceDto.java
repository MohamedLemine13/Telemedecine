package com.irt42.telemedecine.payment.api.dto;

import com.irt42.telemedecine.payment.domain.Invoice;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record InvoiceDto(
    UUID id,
    UUID appointmentId,
    Instant appointmentStartAt,
    String doctorName,
    String patientName,
    BigDecimal amount,
    String currency,
    String status,
    String method,
    Instant issuedAt,
    Instant paidAt,
    BigDecimal reimbursedAmount,
    Instant reimbursedAt
) {
    public static InvoiceDto from(Invoice i) {
        var d = i.getDoctor();
        var p = i.getPatient();
        return new InvoiceDto(
            i.getId(),
            i.getAppointmentId(),
            i.getAppointmentStartAt(),
            displayName(d.getTitle(), d.getFirstName(), d.getLastName(), d.getAccount().getEmail()),
            displayName(null, p.getFirstName(), p.getLastName(), p.getAccount().getEmail()),
            i.getAmount(),
            i.getCurrency(),
            i.getStatus().name(),
            i.getMethod(),
            i.getCreatedAt(),
            i.getPaidAt(),
            i.getReimbursedAmount(),
            i.getReimbursedAt()
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
