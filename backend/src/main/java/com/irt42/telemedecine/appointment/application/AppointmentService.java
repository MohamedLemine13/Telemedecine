package com.irt42.telemedecine.appointment.application;

import com.irt42.telemedecine.appointment.api.dto.AppointmentDto;
import com.irt42.telemedecine.appointment.api.dto.BookAppointmentRequest;
import com.irt42.telemedecine.appointment.api.dto.SlotDto;
import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.doctor.infrastructure.DoctorProfileRepository;
import com.irt42.telemedecine.patient.domain.PatientProfile;
import com.irt42.telemedecine.patient.infrastructure.PatientProfileRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
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

    public AppointmentService(AppointmentRepository appointments,
                              AvailabilityService availabilityService,
                              DoctorProfileRepository doctors,
                              PatientProfileRepository patients,
                              AccountRepository accounts) {
        this.appointments = appointments;
        this.availabilityService = availabilityService;
        this.doctors = doctors;
        this.patients = patients;
        this.accounts = accounts;
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

        return AppointmentDto.from(saveGuardingSlot(a));
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
        return AppointmentDto.from(saveGuardingSlot(a));
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
        return AppointmentDto.from(a);
    }

    // ── helpers ─────────────────────────────────────────────────────────────────

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
