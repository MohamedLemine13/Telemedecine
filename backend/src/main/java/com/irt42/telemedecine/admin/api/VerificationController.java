package com.irt42.telemedecine.admin.api;

import com.irt42.telemedecine.admin.api.dto.DecisionRequest;
import com.irt42.telemedecine.admin.api.dto.VerificationCaseDto;
import com.irt42.telemedecine.admin.application.VerificationService;
import com.irt42.telemedecine.admin.domain.VerificationCase;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/admin/verifications")
@PreAuthorize("hasRole('ADMIN')")
public class VerificationController {

    private final VerificationService service;

    public VerificationController(VerificationService service) { this.service = service; }

    @GetMapping
    public Page<VerificationCaseDto> list(
        @RequestParam(required = false) VerificationCase.Status status,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return service.list(status, page, size);
    }

    @GetMapping("/{id}")
    public VerificationCaseDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    /** Streams the credential file inline (PDF / image) for review. */
    @GetMapping("/{id}/credentials/{credentialId}/download")
    public ResponseEntity<org.springframework.core.io.Resource> download(@PathVariable UUID id,
                                                                         @PathVariable UUID credentialId) {
        VerificationService.CredentialDownload d = service.downloadCredential(id, credentialId);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "inline; filename=\"" + safeName(d.name()) + "\"")
            .contentType(d.contentType() != null
                ? MediaType.parseMediaType(d.contentType())
                : MediaType.APPLICATION_OCTET_STREAM)
            .body(d.resource());
    }

    @PostMapping("/{id}/approve")
    public VerificationCaseDto approve(JwtAuthenticationToken jwt,
                                       @PathVariable UUID id,
                                       @RequestBody(required = false) @Valid DecisionRequest req) {
        return service.approve(id, subject(jwt), req == null ? null : req.note());
    }

    @PostMapping("/{id}/reject")
    public VerificationCaseDto reject(JwtAuthenticationToken jwt,
                                      @PathVariable UUID id,
                                      @RequestBody(required = false) @Valid DecisionRequest req) {
        return service.reject(id, subject(jwt), req == null ? null : req.note());
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }

    private static String safeName(String n) {
        return n == null ? "file" : n.replace("\"", "");
    }
}
