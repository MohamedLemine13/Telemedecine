package com.irt42.telemedecine.appointment.application;

import com.irt42.telemedecine.appointment.api.dto.AppointmentDto;
import com.irt42.telemedecine.appointment.api.dto.BookAppointmentRequest;
import com.irt42.telemedecine.appointment.api.dto.DoctorPatientDto;
import com.irt42.telemedecine.appointment.api.dto.SlotDto;
import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.doctor.infrastructure.DoctorProfileRepository;
import com.irt42.telemedecine.notification.application.NotificationService;
import com.irt42.telemedecine.notification.domain.Notification;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import com.irt42.telemedecine.patient.infrastructure.PatientProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Appointment lifecycle: book → (reschedule) → cancel / complete. Slot validity
 * (alignment, availability, not-in-past, not-already-taken) is delegated to
 * {@link AvailabilityService} so booking and slot listing can never disagree.
 */
@Service
public class AppointmentService {

    private final AppointmentRepository appointments;
    private final AvailabilityService availabilityService;
    private final DoctorProfileRepository doctors;
    private final PatientProfileRepository patients;
    private final AccountRepository accounts;
    private final NotificationService notifications;
    private final ZoneId clinicZone;

    public AppointmentService(AppointmentRepository appointments,
                              AvailabilityService availabilityService,
                              DoctorProfileRepository doctors,
                              PatientProfileRepository patients,
                              AccountRepository accounts,
                              NotificationService notifications,
                              @Value("${telemedecine.clinic.zone:Africa/Nouakchott}") String clinicZone) {
        this.appointments = appointments;
        this.availabilityService = availabilityService;
        this.doctors = doctors;
        this.patients = patients;
        this.accounts = accounts;
        this.notifications = notifications;
        this.clinicZone = ZoneId.of(clinicZone);
    }

    // ── Book (patient) ─────────────────────────────────────────────────────────
    @Transactional
    public AppointmentDto book(UUID patientAccountId, BookAppointmentRequest req) {
        DoctorProfile doctor = doctors.findById(req.doctorId())
            .orElseThrow(notFound("Doctor not found"));
        if (!doctor.isVerified()) throw notFound("Doctor not found").get();

        SlotDto slot = availabilityService.requireFreeSlot(req.doctorId(), req.startAt());
        PatientProfile patient = loadOrCreatePatient(patientAccountId);

        Appointment a = new Appointment();
        a.setDoctor(doctor);
        a.setPatient(patient);
        a.setStartAt(slot.startAt());
        a.setEndAt(slot.endAt());
        a.setMode(req.mode() == null ? Appointment.Mode.VIDEO : req.mode());
        a.setReason(req.reason());
        a.setStatus(Appointment.Status.SCHEDULED);

        Appointment saved = saveGuardingSlot(a);
        String when = formatSlot(saved.getStartAt());
        notifications.notify(patientAccountId, Notification.Type.APPOINTMENT_BOOKED,
            "Appointment confirmed",
            "Your appointment with " + doctorName(doctor) + " is booked for " + when + ".",
            "/patient/appointments");
        notifications.notify(doctor.getAccount().getId(), Notification.Type.APPOINTMENT_BOOKED,
            "New appointment",
            patientName(patient) + " booked " + when + " (" + saved.getMode() + ").",
            "/doctor/agenda");
        return AppointmentDto.from(saved);
    }

    // ── List ───────────────────────────────────────────────────────────────────
    @Transactional(readOnly = true)
    public Page<AppointmentDto> listForPatient(UUID accountId, Appointment.Status status,
                                               int page, int size) {
        PatientProfile p = loadOrCreatePatient(accountId);
        return appointments.findForPatient(p.getId(), status,
                PageRequest.of(page, Math.min(size, 100)))
            .map(AppointmentDto::from);
    }

    /** Open bounds for the doctor agenda when the caller passes no from/to window. */
    private static final Instant FAR_PAST = Instant.EPOCH;
    private static final Instant FAR_FUTURE = Instant.parse("2999-12-31T00:00:00Z");

    @Transactional(readOnly = true)
    public Page<AppointmentDto> listForDoctor(UUID accountId, Appointment.Status status,
                                              Instant from, Instant to, int page, int size) {
        DoctorProfile d = doctors.findByAccountId(accountId)
            .orElseThrow(notFound("Doctor profile not found"));
        Instant lo = from != null ? from : FAR_PAST;
        Instant hi = to != null ? to : FAR_FUTURE;
        return appointments.findForDoctor(d.getId(), status, lo, hi,
                PageRequest.of(page, Math.min(size, 200)))
            .map(AppointmentDto::from);
    }

    // ── Single ───────────────────────────────────────────────────────────────--
    @Transactional(readOnly = true)
    public AppointmentDto get(UUID accountId, UUID appointmentId) {
        return AppointmentDto.from(loadParticipant(accountId, appointmentId));
    }

    // ── Reschedule (either party) ───────────────────────────────────────────────
    @Transactional
    public AppointmentDto reschedule(UUID accountId, UUID appointmentId, Instant newStart) {
        Appointment a = loadParticipant(accountId, appointmentId);
        if (a.getStatus() != Appointment.Status.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only scheduled appointments can be rescheduled");
        }
        SlotDto slot = availabilityService.requireFreeSlot(a.getDoctor().getId(), newStart);
        a.setStartAt(slot.startAt());
        a.setEndAt(slot.endAt());
        Appointment saved = saveGuardingSlot(a);
        notifyCounterpart(accountId, saved, Notification.Type.APPOINTMENT_RESCHEDULED,
            "Appointment rescheduled",
            "The appointment was moved to " + formatSlot(saved.getStartAt()) + ".");
        return AppointmentDto.from(saved);
    }

    // ── Cancel (either party) ───────────────────────────────────────────────────
    @Transactional
    public AppointmentDto cancel(UUID accountId, UUID appointmentId, String reason) {
        Appointment a = loadParticipant(accountId, appointmentId);
        if (a.getStatus() == Appointment.Status.CANCELLED) return AppointmentDto.from(a);
        if (a.getStatus() == Appointment.Status.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Completed appointments cannot be cancelled");
        }
        a.setStatus(Appointment.Status.CANCELLED);
        a.setCancelReason(reason);
        a.setCancelledBy(isDoctor(accountId, a) ? Appointment.Party.DOCTOR : Appointment.Party.PATIENT);
        notifyCounterpart(accountId, a, Notification.Type.APPOINTMENT_CANCELLED,
            "Appointment cancelled",
            "The appointment of " + formatSlot(a.getStartAt()) + " was cancelled"
                + (reason == null || reason.isBlank() ? "." : ": " + reason));
        return AppointmentDto.from(a);
    }

    // ── Complete (doctor only) ──────────────────────────────────────────────────
    @Transactional
    public AppointmentDto complete(UUID accountId, UUID appointmentId) {
        Appointment a = loadParticipant(accountId, appointmentId);
        if (!isDoctor(accountId, a)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the doctor can complete an appointment");
        }
        if (a.getStatus() != Appointment.Status.SCHEDULED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only scheduled appointments can be completed");
        }
        a.setStatus(Appointment.Status.COMPLETED);
        notifications.notify(a.getPatient().getAccount().getId(), Notification.Type.SYSTEM,
            "Consultation completed",
            "Your consultation with " + doctorName(a.getDoctor())
                + " is complete. The invoice is available under Payments.",
            "/patient/payments");
        return AppointmentDto.from(a);
    }

    // ── My patients (doctor) ─────────────────────────────────────────────────────
    /**
     * Distinct patients the doctor has ever had an appointment with, plus
     * simple per-patient stats. Aggregated in memory — a doctor's appointment
     * history is small at this project's scale.
     */
    @Transactional(readOnly = true)
    public List<DoctorPatientDto> listPatientsForDoctor(UUID doctorAccountId) {
        Instant now = Instant.now();
        Map<UUID, DoctorPatientDto.Builder> byPatient = new LinkedHashMap<>();
        for (Appointment a : appointments.findByDoctorAccountIdOrderByStartAtDesc(doctorAccountId)) {
            PatientProfile p = a.getPatient();
            DoctorPatientDto.Builder b = byPatient.computeIfAbsent(p.getId(), id ->
                new DoctorPatientDto.Builder(id, patientName(p), p.getAccount().getEmail()));
            b.total++;
            if (a.getStatus() == Appointment.Status.CANCELLED) continue;
            if (a.getStartAt().isBefore(now)) {
                if (b.lastVisit == null || a.getStartAt().isAfter(b.lastVisit)) b.lastVisit = a.getStartAt();
            } else if (a.getStatus() == Appointment.Status.SCHEDULED
                && (b.nextVisit == null || a.getStartAt().isBefore(b.nextVisit))) {
                b.nextVisit = a.getStartAt();
            }
        }
        return byPatient.values().stream().map(DoctorPatientDto.Builder::build).toList();
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

    private void notifyCounterpart(UUID actorAccountId, Appointment a,
                                   Notification.Type type, String title, String body) {
        boolean actorIsDoctor = isDoctor(actorAccountId, a);
        UUID target = actorIsDoctor
            ? a.getPatient().getAccount().getId()
            : a.getDoctor().getAccount().getId();
        notifications.notify(target, type, title, body,
            actorIsDoctor ? "/patient/appointments" : "/doctor/agenda");
    }

    private String formatSlot(Instant startAt) {
        return DateTimeFormatter.ofPattern("EEE d MMM yyyy 'at' HH:mm")
            .withZone(clinicZone).format(startAt);
    }

    private static String doctorName(DoctorProfile d) {
        String name = joinName(d.getTitle(), d.getFirstName(), d.getLastName());
        return name.isEmpty() ? "your doctor" : name;
    }

    private static String patientName(PatientProfile p) {
        String name = joinName(null, p.getFirstName(), p.getLastName());
        return name.isEmpty() ? p.getAccount().getEmail() : name;
    }

    private static String joinName(String title, String first, String last) {
        StringBuilder sb = new StringBuilder();
        if (title != null && !title.isBlank()) sb.append(title).append(' ');
        if (first != null && !first.isBlank()) sb.append(first).append(' ');
        if (last != null && !last.isBlank()) sb.append(last);
        return sb.toString().trim();
    }

    /** Persist, translating the DB partial-unique-index violation into a friendly 409. */
    private Appointment saveGuardingSlot(Appointment a) {
        try {
            Appointment saved = appointments.saveAndFlush(a);
            return saved;
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "That time was just taken. Please pick another slot.");
        }
    }

    /** Load an appointment the caller participates in (as patient or doctor), else 404. */
    private Appointment loadParticipant(UUID accountId, UUID appointmentId) {
        Appointment a = appointments.findById(appointmentId)
            .orElseThrow(notFound("Appointment not found"));
        boolean isPatient = a.getPatient().getAccount().getId().equals(accountId);
        boolean isDoctor = a.getDoctor().getAccount().getId().equals(accountId);
        if (!isPatient && !isDoctor) throw notFound("Appointment not found").get();
        return a;
    }

    private boolean isDoctor(UUID accountId, Appointment a) {
        return a.getDoctor().getAccount().getId().equals(accountId);
    }

    private PatientProfile loadOrCreatePatient(UUID accountId) {
        return patients.findByAccountId(accountId).orElseGet(() -> {
            PatientProfile pp = new PatientProfile();
            pp.setAccount(accounts.findById(accountId).orElseThrow(notFound("Account not found")));
            return patients.save(pp);
        });
    }

    private static Supplier<ResponseStatusException> notFound(String msg) {
        return () -> new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }
}
