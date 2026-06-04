package com.irt42.telemedecine.appointment.application;

import com.irt42.telemedecine.appointment.api.dto.AvailabilityDto;
import com.irt42.telemedecine.appointment.api.dto.SetAvailabilityRequest;
import com.irt42.telemedecine.appointment.api.dto.SlotDto;
import com.irt42.telemedecine.appointment.domain.DoctorAvailability;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.appointment.infrastructure.DoctorAvailabilityRepository;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import com.irt42.telemedecine.doctor.infrastructure.DoctorProfileRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Supplier;

/**
 * Owns a doctor's weekly availability template and turns it into concrete
 * bookable slots. Slot times are interpreted in the clinic's local zone and
 * returned as UTC instants.
 */
@Service
public class AvailabilityService {

    /** Max horizon a patient can look ahead when fetching slots — keeps responses bounded. */
    private static final int MAX_RANGE_DAYS = 60;

    private final DoctorAvailabilityRepository availability;
    private final AppointmentRepository appointments;
    private final DoctorProfileRepository doctors;
    private final ZoneId clinicZone;

    public AvailabilityService(DoctorAvailabilityRepository availability,
                               AppointmentRepository appointments,
                               DoctorProfileRepository doctors,
                               @Value("${telemedecine.clinic.zone:Africa/Nouakchott}") String clinicZone) {
        this.availability = availability;
        this.appointments = appointments;
        this.doctors = doctors;
        this.clinicZone = ZoneId.of(clinicZone);
    }

    // ── Doctor self-service: read + replace availability ───────────────────────
    @Transactional(readOnly = true)
    public List<AvailabilityDto> listMine(UUID accountId) {
        DoctorProfile d = loadDoctor(accountId);
        return availability.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(d.getId())
            .stream().map(AvailabilityDto::from).toList();
    }

    @Transactional
    public List<AvailabilityDto> replaceMine(UUID accountId, SetAvailabilityRequest req) {
        DoctorProfile d = loadDoctor(accountId);
        for (SetAvailabilityRequest.Block b : req.blocks()) {
            if (!b.endTime().isAfter(b.startTime())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "End time must be after start time for day " + b.dayOfWeek());
            }
        }
        // Full replacement: drop the old set, insert the new one.
        availability.deleteByDoctorId(d.getId());
        availability.flush();

        List<DoctorAvailability> saved = new ArrayList<>();
        for (SetAvailabilityRequest.Block b : req.blocks()) {
            DoctorAvailability a = new DoctorAvailability();
            a.setDoctor(d);
            a.setDayOfWeek((short) b.dayOfWeek());
            a.setStartTime(b.startTime());
            a.setEndTime(b.endTime());
            a.setSlotMinutes(b.slotMinutes());
            saved.add(availability.save(a));
        }
        return saved.stream()
            .sorted((x, y) -> {
                int c = Short.compare(x.getDayOfWeek(), y.getDayOfWeek());
                return c != 0 ? c : x.getStartTime().compareTo(y.getStartTime());
            })
            .map(AvailabilityDto::from).toList();
    }

    // ── Slot computation (patient-facing) ──────────────────────────────────────
    @Transactional(readOnly = true)
    public List<SlotDto> freeSlots(UUID doctorId, LocalDate from, LocalDate to) {
        DoctorProfile d = doctors.findById(doctorId)
            .orElseThrow(notFound("Doctor not found"));
        if (!d.isVerified()) throw notFound("Doctor not found").get();

        if (from == null) from = LocalDate.now(clinicZone);
        if (to == null) to = from.plusDays(14);
        if (to.isBefore(from)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "'to' must not be before 'from'");
        }
        if (from.plusDays(MAX_RANGE_DAYS).isBefore(to)) {
            to = from.plusDays(MAX_RANGE_DAYS);
        }

        List<DoctorAvailability> blocks =
            availability.findByDoctorIdOrderByDayOfWeekAscStartTimeAsc(doctorId);
        if (blocks.isEmpty()) return List.of();

        Instant windowStart = from.atStartOfDay(clinicZone).toInstant();
        Instant windowEnd = to.plusDays(1).atStartOfDay(clinicZone).toInstant();
        Set<Instant> taken = new HashSet<>(
            appointments.liveStartsInWindow(doctorId, windowStart, windowEnd));

        Instant now = Instant.now();
        List<SlotDto> slots = new ArrayList<>();
        for (LocalDate day = from; !day.isAfter(to); day = day.plusDays(1)) {
            short dow = (short) day.getDayOfWeek().getValue();
            for (DoctorAvailability b : blocks) {
                if (b.getDayOfWeek() != dow) continue;
                LocalTime t = b.getStartTime();
                while (!t.plusMinutes(b.getSlotMinutes()).isAfter(b.getEndTime())) {
                    Instant start = day.atTime(t).atZone(clinicZone).toInstant();
                    Instant end = start.plusSeconds(b.getSlotMinutes() * 60L);
                    if (start.isAfter(now) && !taken.contains(start)) {
                        slots.add(new SlotDto(start, end));
                    }
                    t = t.plusMinutes(b.getSlotMinutes());
                }
            }
        }
        slots.sort((a, b) -> a.startAt().compareTo(b.startAt()));
        return slots;
    }

    /**
     * Assert that {@code startAt} is a currently-free, grid-aligned slot for the
     * doctor and return it (with its computed end instant). Throws 409 otherwise.
     * Booking and rescheduling both go through here so they can never disagree
     * with what slot listing advertised.
     */
    @Transactional(readOnly = true)
    public SlotDto requireFreeSlot(UUID doctorId, Instant startAt) {
        LocalDate day = startAt.atZone(clinicZone).toLocalDate();
        return freeSlots(doctorId, day, day).stream()
            .filter(s -> s.startAt().equals(startAt))
            .findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT,
                "That time is not available. Please pick another slot."));
    }

    private DoctorProfile loadDoctor(UUID accountId) {
        return doctors.findByAccountId(accountId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                "Complete your doctor profile before setting availability"));
    }

    private static Supplier<ResponseStatusException> notFound(String msg) {
        return () -> new ResponseStatusException(HttpStatus.NOT_FOUND, msg);
    }
}
