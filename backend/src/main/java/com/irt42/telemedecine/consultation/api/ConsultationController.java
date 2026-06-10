package com.irt42.telemedecine.consultation.api;

import com.irt42.telemedecine.common.pdf.PdfDocuments;
import com.irt42.telemedecine.consultation.api.dto.ChatMessageDto;
import com.irt42.telemedecine.consultation.api.dto.ClinicalNoteDto;
import com.irt42.telemedecine.consultation.api.dto.ConversationDto;
import com.irt42.telemedecine.consultation.api.dto.JoinResponse;
import com.irt42.telemedecine.consultation.api.dto.SendMessageRequest;
import com.irt42.telemedecine.consultation.api.dto.UpdateNoteRequest;
import com.irt42.telemedecine.consultation.application.ConsultationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/consultations")
@PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
public class ConsultationController {

    private final ConsultationService service;

    public ConsultationController(ConsultationService service) { this.service = service; }

    /** Conversations of the signed-in user — drives the Messages screens. */
    @GetMapping
    public List<ConversationDto> conversations(JwtAuthenticationToken jwt) {
        return service.listConversations(subject(jwt));
    }

    /** Consultation report as PDF (doctor-only — it embeds the private clinical note). */
    @GetMapping("/{id}/report.pdf")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<byte[]> reportPdf(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        ConsultationService.ReportData r = service.reportData(subject(jwt), id);
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy · HH:mm")
            .withZone(ZoneId.of("Africa/Nouakchott"));
        byte[] pdf = PdfDocuments.document(
            "Consultation report",
            "Telemedecine platform — generated " + fmt.format(Instant.now()),
            List.of(
                new PdfDocuments.Meta("Doctor", r.doctorName()),
                new PdfDocuments.Meta("Patient", r.patientName()),
                new PdfDocuments.Meta("Scheduled", r.scheduledAt() == null ? null : fmt.format(r.scheduledAt())),
                new PdfDocuments.Meta("Started", r.startedAt() == null ? null : fmt.format(r.startedAt())),
                new PdfDocuments.Meta("Ended", r.endedAt() == null ? null : fmt.format(r.endedAt())),
                new PdfDocuments.Meta("Mode", r.mode()),
                new PdfDocuments.Meta("Reason", r.reason()),
                new PdfDocuments.Meta("Chat messages", String.valueOf(r.messageCount()))
            ),
            "Clinical notes",
            r.clinicalNote() == null || r.clinicalNote().isBlank()
                ? "(no notes were taken)" : r.clinicalNote(),
            "Confidential medical document — school project, not a real medical record."
        );
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION,
                "attachment; filename=\"consultation-report-" + id + ".pdf\"")
            .contentType(MediaType.APPLICATION_PDF)
            .body(pdf);
    }

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
