package com.irt42.telemedecine.prescription.application;

import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.prescription.api.dto.IssuePrescriptionRequest;
import com.irt42.telemedecine.prescription.api.dto.PrescriptionDto;
import com.irt42.telemedecine.prescription.domain.Prescription;
import com.irt42.telemedecine.prescription.infrastructure.PrescriptionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Issue and list e-prescriptions. A prescription always hangs off one of the
 * doctor's own appointments — that is both the authorisation check (you can
 * only prescribe to patients you actually saw) and where the patient side of
 * the relation comes from.
 */
@Service
public class PrescriptionService {

    private final PrescriptionRepository prescriptions;
    private final AppointmentRepository appointments;

    public PrescriptionService(PrescriptionRepository prescriptions,
                               AppointmentRepository appointments) {
        this.prescriptions = prescriptions;
        this.appointments = appointments;
    }

    @Transactional
    public PrescriptionDto issue(UUID doctorAccountId, IssuePrescriptionRequest req) {
        Appointment appt = appointments.findById(req.appointmentId())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (!appt.getDoctor().getAccount().getId().equals(doctorAccountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found");
        }
        if (appt.getStatus() == Appointment.Status.CANCELLED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cannot prescribe on a cancelled appointment");
        }

        Prescription p = new Prescription();
        p.setDoctor(appt.getDoctor());
        p.setPatient(appt.getPatient());
        p.setAppointmentId(appt.getId());
        p.setTitle(req.title().trim());
        p.setBody(req.body().trim());
        p.setIssuedAt(Instant.now());
        return PrescriptionDto.from(prescriptions.save(p));
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDto> listForPatient(UUID accountId) {
        return prescriptions.findByPatientAccountIdOrderByIssuedAtDesc(accountId)
            .stream().map(PrescriptionDto::from).toList();
    }

    @Transactional(readOnly = true)
    public List<PrescriptionDto> listForDoctor(UUID accountId) {
        return prescriptions.findByDoctorAccountIdOrderByIssuedAtDesc(accountId)
            .stream().map(PrescriptionDto::from).toList();
    }

    @Transactional(readOnly = true)
    public PrescriptionDto get(UUID accountId, UUID id) {
        Prescription p = prescriptions.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Prescription not found"));
        boolean participant = p.getDoctor().getAccount().getId().equals(accountId)
            || p.getPatient().getAccount().getId().equals(accountId);
        if (!participant) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Prescription not found");
        }
        return PrescriptionDto.from(p);
    }
}
