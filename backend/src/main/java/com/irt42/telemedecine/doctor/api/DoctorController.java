package com.irt42.telemedecine.doctor.api;

import com.irt42.telemedecine.doctor.api.dto.CredentialDto;
import com.irt42.telemedecine.doctor.api.dto.DoctorProfileDto;
import com.irt42.telemedecine.doctor.api.dto.SpecialtyDto;
import com.irt42.telemedecine.doctor.api.dto.UpdateDoctorProfileRequest;
import com.irt42.telemedecine.doctor.application.DoctorService;
import com.irt42.telemedecine.doctor.domain.Credential;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/doctors")
public class DoctorController {

    private final DoctorService service;

    public DoctorController(DoctorService service) { this.service = service; }

    // ── Public search ──
    @GetMapping
    public Page<DoctorProfileDto> search(
        @RequestParam(required = false) String specialty,
        @RequestParam(required = false) String language,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return service.search(specialty, language, page, size);
    }

    @GetMapping("/specialties")
    public List<SpecialtyDto> specialties() {
        return service.listSpecialties();
    }

    @GetMapping("/{id}")
    public DoctorProfileDto getOne(@PathVariable UUID id) {
        return service.getById(id);
    }

    // ── "me" — doctor self-service ──
    @GetMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public DoctorProfileDto getMine(JwtAuthenticationToken jwt) {
        return service.getOrCreateMine(subject(jwt));
    }

    @PutMapping("/me")
    @PreAuthorize("hasRole('DOCTOR')")
    public DoctorProfileDto updateMine(JwtAuthenticationToken jwt,
                                       @RequestBody @Valid UpdateDoctorProfileRequest req) {
        return service.updateMine(subject(jwt), req);
    }

    /**
     * Single-step credential upload via multipart/form-data.
     * Form fields: file (binary), kind (DIPLOMA / BOARD_CERT / LICENSE / OTHER),
     * optional issuer.
     */
    @PostMapping(value = "/me/credentials", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DOCTOR')")
    @ResponseStatus(HttpStatus.CREATED)
    public CredentialDto uploadCredential(JwtAuthenticationToken jwt,
                                          @RequestParam("kind") Credential.Kind kind,
                                          @RequestParam(value = "issuer", required = false) String issuer,
                                          @RequestParam("file") MultipartFile file) {
        return service.uploadCredential(subject(jwt), kind, issuer, file);
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
