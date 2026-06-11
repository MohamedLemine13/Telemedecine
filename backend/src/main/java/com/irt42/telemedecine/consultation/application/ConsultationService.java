package com.irt42.telemedecine.consultation.application;

import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.consultation.api.dto.ChatMessageDto;
import com.irt42.telemedecine.consultation.api.dto.ClinicalNoteDto;
import com.irt42.telemedecine.consultation.api.dto.ConversationDto;
import com.irt42.telemedecine.consultation.api.dto.JoinResponse;
import com.irt42.telemedecine.consultation.domain.ChatMessage;
import com.irt42.telemedecine.consultation.domain.ClinicalNote;
import com.irt42.telemedecine.consultation.domain.Consultation;
import com.irt42.telemedecine.consultation.infrastructure.ChatMessageRepository;
import com.irt42.telemedecine.consultation.infrastructure.ClinicalNoteRepository;
import com.irt42.telemedecine.consultation.infrastructure.ConsultationRepository;
import com.irt42.telemedecine.consultation.infrastructure.ws.ChatSocketHandler;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.notification.application.NotificationService;
import com.irt42.telemedecine.notification.domain.Notification;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Consultation lifecycle + in-call chat + the doctor's clinical note. Video
 * itself is peer-to-peer through LiveKit; this service only mints room tokens
 * and persists the things that must outlive the call.
 */
@Service
public class ConsultationService {

    private static final long TOKEN_TTL_SECONDS = 2 * 60 * 60;   // 2h join window

    private final ConsultationRepository consultations;
    private final ChatMessageRepository messages;
    private final ClinicalNoteRepository notes;
    private final AppointmentRepository appointments;
    private final LivekitTokenService livekit;
    private final ChatSocketHandler chatSocket;
    private final NotificationService notifications;
    private final String livekitUrl;

    public ConsultationService(ConsultationRepository consultations,
                               ChatMessageRepository messages,
                               ClinicalNoteRepository notes,
                               AppointmentRepository appointments,
                               LivekitTokenService livekit,
                               ChatSocketHandler chatSocket,
                               NotificationService notifications,
                               @Value("${telemedecine.livekit.public-url:ws://localhost:7880}") String livekitUrl) {
        this.consultations = consultations;
        this.messages = messages;
        this.notes = notes;
        this.appointments = appointments;
        this.livekit = livekit;
        this.chatSocket = chatSocket;
        this.notifications = notifications;
        this.livekitUrl = livekitUrl;
    }

    // ── Join ────────────────────────────────────────────────────────────────-
    @Transactional
    public JoinResponse join(UUID accountId, UUID appointmentId) {
        Appointment appt = appointments.findById(appointmentId)
            .orElseThrow(notFound("Appointment not found"));
        Side side = sideOf(accountId, appt);   // 404s if caller isn't a participant
        if (appt.getStatus() == Appointment.Status.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This appointment was cancelled");
        }

        Consultation c = consultations.findByAppointmentId(appointmentId).orElseGet(() -> {
            Consultation nc = new Consultation();
            nc.setAppointment(appt);
            nc.setRoomName("consult-" + appointmentId);
            nc.setStatus(Consultation.Status.ACTIVE);
            nc.setStartedAt(Instant.now());
            return consultations.save(nc);
        });
        if (c.getStatus() == Consultation.Status.ENDED) {
            // Re-opening a finished call (e.g. dropped connection) is fine.
            c.setStatus(Consultation.Status.ACTIVE);
            c.setEndedAt(null);
        }

        String token = livekit.mint(c.getRoomName(), accountId.toString(), side.selfName, TOKEN_TTL_SECONDS);
        return new JoinResponse(
            c.getId(), appt.getId(), c.getRoomName(), livekitUrl, token,
            accountId.toString(), side.role.name(), side.selfName, side.counterpartName,
            appt.getMode().name()
        );
    }

    // ── End ───────────────────────────────────────────────────────────────---
    @Transactional
    public void end(UUID accountId, UUID consultationId) {
        Consultation c = loadParticipantConsultation(accountId, consultationId);
        Side side = sideOf(accountId, c.getAppointment());

        // A patient stepping out of the room must NOT close the consultation: they
        // may have joined early, dropped, or be coming back. Only the doctor — who
        // owns the clinical encounter — ends the call and completes the appointment.
        if (side.role != Appointment.Party.DOCTOR) {
            return;
        }

        if (c.getStatus() == Consultation.Status.ENDED) return;
        c.setStatus(Consultation.Status.ENDED);
        c.setEndedAt(Instant.now());
        // The doctor wrapping up the call marks a still-scheduled appointment as completed.
        Appointment appt = c.getAppointment();
        if (appt.getStatus() == Appointment.Status.SCHEDULED) {
            appt.setStatus(Appointment.Status.COMPLETED);
        }
    }

    // ── Chat ──────────────────────────────────────────────────────────────---
    @Transactional(readOnly = true)
    public List<ChatMessageDto> listMessages(UUID accountId, UUID consultationId) {
        loadParticipantConsultation(accountId, consultationId);
        return messages.findByConsultationIdOrderByCreatedAtAsc(consultationId)
            .stream().map(ChatMessageDto::from).toList();
    }

    @Transactional
    public ChatMessageDto sendMessage(UUID accountId, UUID consultationId, String body) {
        Consultation c = loadParticipantConsultation(accountId, consultationId);
        Side side = sideOf(accountId, c.getAppointment());
        ChatMessage m = new ChatMessage();
        m.setConsultation(c);
        m.setSenderAccountId(accountId);
        m.setSenderName(side.selfName);
        m.setSenderRole(side.role);
        m.setBody(body);
        ChatMessageDto dto = ChatMessageDto.from(messages.save(m));

        // Real-time push to every open socket of this room; if the counterpart
        // is not connected right now, leave them an in-app notification instead.
        chatSocket.broadcast(consultationId, dto);
        UUID counterpartId = counterpartAccountId(accountId, c.getAppointment());
        if (!chatSocket.isConnected(consultationId, counterpartId)) {
            String preview = body.length() > 120 ? body.substring(0, 117) + "…" : body;
            notifications.notify(counterpartId, Notification.Type.NEW_CHAT_MESSAGE,
                "New message from " + side.selfName(), preview,
                (side.role == Appointment.Party.DOCTOR ? "/patient" : "/doctor") + "/messages");
        }
        return dto;
    }

    // ── Conversations (Messages screens) ─────────────────────────────────────
    @Transactional(readOnly = true)
    public List<ConversationDto> listConversations(UUID accountId) {
        List<ConversationDto> out = new ArrayList<>();
        for (Consultation c : consultations.findAllForAccount(accountId)) {
            Side side = sideOf(accountId, c.getAppointment());
            ChatMessage last = messages
                .findFirstByConsultationIdOrderByCreatedAtDesc(c.getId()).orElse(null);
            out.add(new ConversationDto(
                c.getId(),
                c.getAppointment().getId(),
                side.counterpartName(),
                c.getAppointment().getMode().name(),
                c.getStatus().name(),
                c.getStartedAt(),
                c.getEndedAt(),
                last == null ? null : last.getBody(),
                last == null ? null : last.getSenderName(),
                last == null ? null : last.getCreatedAt(),
                (int) messages.countByConsultationId(c.getId())
            ));
        }
        return out;
    }

    /**
     * Everything the consultation-report PDF needs, resolved in one
     * transaction. Doctor-only: the report embeds the private clinical note.
     */
    @Transactional(readOnly = true)
    public ReportData reportData(UUID accountId, UUID consultationId) {
        Consultation c = loadParticipantConsultation(accountId, consultationId);
        requireDoctor(accountId, c);
        Side side = sideOf(accountId, c.getAppointment());
        String note = notes.findByConsultationId(consultationId)
            .map(ClinicalNote::getBody).orElse(null);
        Appointment appt = c.getAppointment();
        return new ReportData(
            c.getId(), side.selfName(), side.counterpartName(),
            appt.getStartAt(), c.getStartedAt(), c.getEndedAt(),
            appt.getMode().name(), appt.getReason(), note,
            (int) messages.countByConsultationId(consultationId)
        );
    }

    public record ReportData(
        UUID consultationId, String doctorName, String patientName,
        Instant scheduledAt, Instant startedAt, Instant endedAt,
        String mode, String reason, String clinicalNote, int messageCount
    ) {}

    // ── Clinical note (doctor only) ───────────────────────────────────────---
    @Transactional
    public ClinicalNoteDto getNote(UUID accountId, UUID consultationId) {
        Consultation c = loadParticipantConsultation(accountId, consultationId);
        requireDoctor(accountId, c);
        ClinicalNote note = notes.findByConsultationId(consultationId).orElseGet(() -> {
            ClinicalNote n = new ClinicalNote();
            n.setConsultation(c);
            return notes.save(n);
        });
        return ClinicalNoteDto.from(note);
    }

    @Transactional
    public ClinicalNoteDto updateNote(UUID accountId, UUID consultationId, String body) {
        Consultation c = loadParticipantConsultation(accountId, consultationId);
        requireDoctor(accountId, c);
        ClinicalNote note = notes.findByConsultationId(consultationId).orElseGet(() -> {
            ClinicalNote n = new ClinicalNote();
            n.setConsultation(c);
            return n;
        });
        note.setBody(body);
        return ClinicalNoteDto.from(notes.save(note));
    }

    // ── helpers ───────────────────────────────────────────────────────────---

    private Consultation loadParticipantConsultation(UUID accountId, UUID consultationId) {
        Consultation c = consultations.findById(consultationId)
            .orElseThrow(notFound("Consultation not found"));
        sideOf(accountId, c.getAppointment());   // 404s if not a participant
        return c;
    }

    private void requireDoctor(UUID accountId, Consultation c) {
        if (sideOf(accountId, c.getAppointment()).role != Appointment.Party.DOCTOR) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Clinical notes are doctor-only");
        }
    }

    /** Resolve which side of the appointment the caller is, with display names. */
    private Side sideOf(UUID accountId, Appointment appt) {
        DoctorProfile d = appt.getDoctor();
        PatientProfile p = appt.getPatient();
        String doctorName = displayName(d.getTitle(), d.getFirstName(), d.getLastName(), d.getAccount().getEmail());
        String patientName = displayName(null, p.getFirstName(), p.getLastName(), p.getAccount().getEmail());
        if (d.getAccount().getId().equals(accountId)) {
            return new Side(Appointment.Party.DOCTOR, doctorName, patientName);
        }
        if (p.getAccount().getId().equals(accountId)) {
            return new Side(Appointment.Party.PATIENT, patientName, doctorName);
        }
        throw notFound("Consultation not found").get();
    }

    private static String displayName(String title, String first, String last, String fallback) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) sb.append(title).append(' ');
        if (first != null && !first.isBlank()) sb.append(first).append(' ');
        if (last != null && !last.isBlank()) sb.append(last);
        String name = sb.toString().trim();
        return name.isEmpty() ? fallback : name;
    }

    private static UUID counterpartAccountId(UUID accountId, Appointment appt) {
        UUID doctorAccount = appt.getDoctor().getAccount().getId();
        return doctorAccount.equals(accountId)
            ? appt.getPatient().getAccount().getId()
            : doctorAccount;
    }

    private static Supplier<ResponseStatusException> notFound(String msg) {
        return () -> new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }

    /** The caller's side of an appointment: their role + both display names. */
    private record Side(Appointment.Party role, String selfName, String counterpartName) {}
}
