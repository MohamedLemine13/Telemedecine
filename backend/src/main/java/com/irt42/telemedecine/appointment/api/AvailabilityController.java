package com.irt42.telemedecine.appointment.api;

import com.irt42.telemedecine.appointment.api.dto.AvailabilityDto;
import com.irt42.telemedecine.appointment.api.dto.SetAvailabilityRequest;
import com.irt42.telemedecine.appointment.api.dto.SlotDto;
import com.irt42.telemedecine.appointment.application.AvailabilityService;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Doctor availability template (self-service) and the derived public slot list.
 * Shares the {@code /api/doctors} base path with {@code DoctorController} —
 * Spring routes by the full method path so the two coexist cleanly.
 */
@RestController
@RequestMapping("/api/doctors")
public class AvailabilityController {

    private final AvailabilityService service;

    public AvailabilityController(AvailabilityService service) { this.service = service; }

    @GetMapping("/me/availability")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<AvailabilityDto> getMine(JwtAuthenticationToken jwt) {
        return service.listMine(subject(jwt));
    }

    @PutMapping("/me/availability")
    @PreAuthorize("hasRole('DOCTOR')")
    public List<AvailabilityDto> setMine(JwtAuthenticationToken jwt,
                                         @RequestBody @Valid SetAvailabilityRequest req) {
        return service.replaceMine(subject(jwt), req);
    }

    /** Free, bookable slots for a doctor between two dates (inclusive). */
    @GetMapping("/{id}/slots")
    public List<SlotDto> slots(
        @PathVariable UUID id,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return service.freeSlots(id, from, to);
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
