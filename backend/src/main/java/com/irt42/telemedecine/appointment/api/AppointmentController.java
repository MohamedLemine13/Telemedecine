package com.irt42.telemedecine.appointment.api;

import com.irt42.telemedecine.appointment.api.dto.AppointmentDto;
import com.irt42.telemedecine.appointment.api.dto.BookAppointmentRequest;
import com.irt42.telemedecine.appointment.api.dto.CancelRequest;
import com.irt42.telemedecine.appointment.api.dto.DoctorPatientDto;
import com.irt42.telemedecine.appointment.api.dto.RescheduleRequest;
import com.irt42.telemedecine.appointment.application.AppointmentService;
import com.irt42.telemedecine.appointment.domain.Appointment;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/appointments")
public class AppointmentController {

    private final AppointmentService service;

    public AppointmentController(AppointmentService service) { this.service = service; }

    /** Patient books a slot. */
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    @ResponseStatus(HttpStatus.CREATED)
    public AppointmentDto book(JwtAuthenticationToken jwt,
                               @RequestBody @Valid BookAppointmentRequest req) {
        return service.book(subject(jwt), req);
    }

    /**
     * Role-aware listing: a doctor sees their agenda (optionally windowed by
     * from/to), a patient sees their own appointments. Both filterable by status.
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public Page<AppointmentDto> list(
        JwtAuthenticationToken jwt,
        @RequestParam(required = false) Appointment.Status status,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        if (hasRole(jwt, "ROLE_DOCTOR")) {
            return service.listForDoctor(subject(jwt), status, from, to, page, size);
        }
        return service.listForPatient(subject(jwt), status, page, size);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public AppointmentDto get(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.get(subject(jwt), id);
    }

    @PatchMapping("/{id}/reschedule")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public AppointmentDto reschedule(JwtAuthenticationToken jwt, @PathVariable UUID id,
                                     @RequestBody @Valid RescheduleRequest req) {
        return service.reschedule(subject(jwt), id, req.startAt());
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public AppointmentDto cancel(JwtAuthenticationToken jwt, @PathVariable UUID id,
                                 @RequestBody(required = false) @Valid CancelRequest req) {
        return service.cancel(subject(jwt), id, req == null ? null : req.reason());
    }

    @PostMapping("/{id}/complete")
    @PreAuthorize("hasRole('DOCTOR')")
    public AppointmentDto complete(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.complete(subject(jwt), id);
    }

    /**
     * Distinct patients the doctor has seen (or will see), with per-patient
     * stats — the "My patients" screen. Declared before the {@code /{id}}
     * mapping cannot shadow it because "patients" is not a UUID.
     */
    @GetMapping("/patients")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<DoctorPatientDto> myPatients(JwtAuthenticationToken jwt) {
        return service.listPatientsForDoctor(subject(jwt));
    }

    private static boolean hasRole(JwtAuthenticationToken jwt, String role) {
        return AuthorityUtils.authorityListToSet(jwt.getAuthorities()).contains(role);
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
