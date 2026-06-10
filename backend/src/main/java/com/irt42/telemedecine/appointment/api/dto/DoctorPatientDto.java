package com.irt42.telemedecine.appointment.api.dto;

import java.time.Instant;
import java.util.UUID;

/** One row of the doctor's "My patients" screen, aggregated from appointments. */
public record DoctorPatientDto(
    UUID patientId,
    String name,
    String email,
    int appointmentCount,
    Instant lastVisitAt,
    Instant nextAppointmentAt
) {
    /** Mutable accumulator used while grouping appointments by patient. */
    public static final class Builder {
        public final UUID patientId;
        public final String name;
        public final String email;
        public int total;
        public Instant lastVisit;
        public Instant nextVisit;

        public Builder(UUID patientId, String name, String email) {
            this.patientId = patientId;
            this.name = name;
            this.email = email;
        }

        public DoctorPatientDto build() {
            return new DoctorPatientDto(patientId, name, email, total, lastVisit, nextVisit);
        }
    }
}
