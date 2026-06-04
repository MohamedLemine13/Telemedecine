package com.irt42.telemedecine.consultation.api;

import com.irt42.telemedecine.consultation.api.dto.ChatMessageDto;
import com.irt42.telemedecine.consultation.api.dto.ClinicalNoteDto;
import com.irt42.telemedecine.consultation.api.dto.JoinResponse;
import com.irt42.telemedecine.consultation.api.dto.SendMessageRequest;
import com.irt42.telemedecine.consultation.api.dto.UpdateNoteRequest;
import com.irt42.telemedecine.consultation.application.ConsultationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/consultations")
@PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
public class ConsultationController {

    private final ConsultationService service;

    public ConsultationController(ConsultationService service) { this.service = service; }

    /** Join (or open) the consultation for an appointment; returns a LiveKit token. */
    @PostMapping("/{appointmentId}/join")
    public JoinResponse join(JwtAuthenticationToken jwt, @PathVariable UUID appointmentId) {
        return service.join(subject(jwt), appointmentId);
    }

    @PostMapping("/{id}/end")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void end(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        service.end(subject(jwt), id);
    }

    @GetMapping("/{id}/messages")
    public List<ChatMessageDto> messages(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.listMessages(subject(jwt), id);
    }

    @PostMapping("/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto send(JwtAuthenticationToken jwt, @PathVariable UUID id,
                               @RequestBody @Valid SendMessageRequest req) {
        return service.sendMessage(subject(jwt), id, req.body());
    }

    @GetMapping("/{id}/notes")
    public ClinicalNoteDto getNote(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.getNote(subject(jwt), id);
    }

    @PutMapping("/{id}/notes")
    public ClinicalNoteDto updateNote(JwtAuthenticationToken jwt, @PathVariable UUID id,
                                      @RequestBody @Valid UpdateNoteRequest req) {
        return service.updateNote(subject(jwt), id, req.body());
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
