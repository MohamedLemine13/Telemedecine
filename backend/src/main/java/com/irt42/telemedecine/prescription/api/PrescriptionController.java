package com.irt42.telemedecine.prescription.api;

import com.irt42.telemedecine.common.pdf.PdfDocuments;
import com.irt42.telemedecine.prescription.api.dto.IssuePrescriptionRequest;
import com.irt42.telemedecine.prescription.api.dto.PrescriptionDto;
import com.irt42.telemedecine.prescription.application.PrescriptionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/prescriptions")
public class PrescriptionController {

    private final PrescriptionService service;

    public PrescriptionController(PrescriptionService service) { this.service = service; }

    /** Doctor issues a prescription against one of their appointments. */
    @PostMapping
    @PreAuthorize("hasRole('DOCTOR')")
    @ResponseStatus(HttpStatus.CREATED)
    public PrescriptionDto issue(JwtAuthenticationToken jwt,
                                 @RequestBody @Valid IssuePrescriptionRequest req) {
        return service.issue(subject(jwt), req);
    }

    /** Role-aware list: a patient sees prescriptions received, a doctor those issued. */
    @GetMapping
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public List<PrescriptionDto> list(JwtAuthenticationToken jwt) {
        if (hasRole(jwt, "ROLE_DOCTOR")) {
            return service.listForDoctor(subject(jwt));
        }
        return service.listForPatient(subject(jwt));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public PrescriptionDto get(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.get(subject(jwt), id);
    }

    /** The prescription as a downloadable PDF (participant-only). */
    @GetMapping("/{id}/pdf")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public ResponseEntity<byte[]> pdf(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        PrescriptionDto p = service.get(subject(jwt), id);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy · HH:mm")
            .withZone(ZoneId.of("Africa/Nouakchott"));
        byte[] pdf = PdfDocuments.document(
            "e-Prescription",
            p.title(),
            List.of(
                new PdfDocuments.Meta("Doctor", p.doctorName()),
                new PdfDocuments.Meta("Patient", p.patientName()),
                new PdfDocuments.Meta("Issued", p.issuedAt() == null ? null : fmt.format(p.issuedAt())),
                new PdfDocuments.Meta("Reference", p.id().toString())
            ),
            "Medications & instructions",
            p.body(),
            "Simulated e-prescription — school project, not valid for dispensing."
        );
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"prescription-" + id + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }

    private static boolean hasRole(JwtAuthenticationToken jwt, String role) {
        return AuthorityUtils.authorityListToSet(jwt.getAuthorities()).contains(role);
    }
}
