package com.irt42.telemedecine.appointment.api.dto;

import com.irt42.telemedecine.appointment.domain.Appointment;

import java.time.Instant;
import java.util.UUID;

public record AppointmentDto(
    UUID id,
    String status,
    String mode,
    Instant startAt,
    Instant endAt,
    String reason,
    String cancelReason,
    String cancelledBy,
    Party doctor,
    Party patient
) {
    /** Lightweight reference to the doctor or patient on each side of the appointment. */
    public record Party(UUID id, String name, String email) {}

    public static AppointmentDto from(Appointment a) {
        var d = a.getDoctor();
        var p = a.getPatient();
        String doctorName = displayName(d.getTitle(), d.getFirstName(), d.getLastName());
        String patientName = displayName(null, p.getFirstName(), p.getLastName());
        return new AppointmentDto(
            a.getId(),
            a.getStatus().name(),
            a.getMode().name(),
            a.getStartAt(),
            a.getEndAt(),
            a.getReason(),
            a.getCancelReason(),
            a.getCancelledBy() == null ? null : a.getCancelledBy().name(),
            new Party(d.getId(), doctorName, d.getAccount().getEmail()),
            new Party(p.getId(), patientName, p.getAccount().getEmail())
        );
    }

    private static String displayName(String title, String first, String last) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) sb.append(title).append(' ');
        if (first != null && !first.isBlank()) sb.append(first).append(' ');
        if (last != null && !last.isBlank()) sb.append(last);
        String name = sb.toString().trim();
        return name.isEmpty() ? null : name;
    }
}
