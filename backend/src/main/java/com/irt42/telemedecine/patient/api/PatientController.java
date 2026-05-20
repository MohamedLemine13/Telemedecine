package com.irt42.telemedecine.patient.api;

import com.irt42.telemedecine.patient.api.dto.AllergyDto;
import com.irt42.telemedecine.patient.api.dto.LabResultDto;
import com.irt42.telemedecine.patient.api.dto.PatientProfileDto;
import com.irt42.telemedecine.patient.api.dto.TreatmentDto;
import com.irt42.telemedecine.patient.api.dto.UpdatePatientProfileRequest;
import com.irt42.telemedecine.patient.application.PatientService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/patients/me")
@PreAuthorize("hasRole('PATIENT')")
public class PatientController {

    private final PatientService service;

    public PatientController(PatientService service) { this.service = service; }

    @GetMapping
    public PatientProfileDto getMyProfile(JwtAuthenticationToken jwt) {
        return service.getOrCreateMine(subject(jwt));
    }

    @PutMapping
    public PatientProfileDto updateMyProfile(JwtAuthenticationToken jwt,
                                             @RequestBody @Valid UpdatePatientProfileRequest req) {
        return service.updateMine(subject(jwt), req);
    }

    // ── Allergies ──
    @PostMapping("/allergies")
    @ResponseStatus(HttpStatus.CREATED)
    public AllergyDto addAllergy(JwtAuthenticationToken jwt, @RequestBody @Valid AllergyDto dto) {
        return service.addAllergy(subject(jwt), dto);
    }

    @DeleteMapping("/allergies/{id}")
    public ResponseEntity<Void> deleteAllergy(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        service.deleteAllergy(subject(jwt), id);
        return ResponseEntity.noContent().build();
    }

    // ── Treatments ──
    @PostMapping("/treatments")
    @ResponseStatus(HttpStatus.CREATED)
    public TreatmentDto addTreatment(JwtAuthenticationToken jwt, @RequestBody @Valid TreatmentDto dto) {
        return service.addTreatment(subject(jwt), dto);
    }

    @DeleteMapping("/treatments/{id}")
    public ResponseEntity<Void> deleteTreatment(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        service.deleteTreatment(subject(jwt), id);
        return ResponseEntity.noContent().build();
    }

    // ── Lab results ──
    @PostMapping("/lab-results")
    @ResponseStatus(HttpStatus.CREATED)
    public LabResultDto addLabResult(JwtAuthenticationToken jwt, @RequestBody @Valid LabResultDto dto) {
        return service.addLabResult(subject(jwt), dto);
    }

    @DeleteMapping("/lab-results/{id}")
    public ResponseEntity<Void> deleteLabResult(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        service.deleteLabResult(subject(jwt), id);
        return ResponseEntity.noContent().build();
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
