package com.irt42.telemedecine.admin.application;

import com.irt42.telemedecine.admin.api.dto.AdminMetricsDto;
import com.irt42.telemedecine.admin.domain.VerificationCase;
import com.irt42.telemedecine.admin.infrastructure.VerificationCaseRepository;
import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.consultation.domain.Consultation;
import com.irt42.telemedecine.consultation.infrastructure.ConsultationRepository;
import com.irt42.telemedecine.doctor.infrastructure.DoctorProfileRepository;
import com.irt42.telemedecine.patient.infrastructure.PatientProfileRepository;
import com.irt42.telemedecine.payment.domain.Invoice;
import com.irt42.telemedecine.payment.infrastructure.InvoiceRepository;
import com.irt42.telemedecine.prescription.infrastructure.PrescriptionRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Read-only cross-module aggregation for the admin dashboard. Counting via the
 * other modules' repositories keeps this a thin reporting layer — it owns no
 * data of its own.
 */
@Service
public class AdminMetricsService {

    private static final int CHART_DAYS = 14;

    private final AccountRepository accounts;
    private final PatientProfileRepository patients;
    private final DoctorProfileRepository doctors;
    private final VerificationCaseRepository verifications;
    private final AppointmentRepository appointments;
    private final ConsultationRepository consultations;
    private final PrescriptionRepository prescriptions;
    private final InvoiceRepository invoices;
    private final ZoneId clinicZone;

    public AdminMetricsService(AccountRepository accounts,
                               PatientProfileRepository patients,
                               DoctorProfileRepository doctors,
                               VerificationCaseRepository verifications,
                               AppointmentRepository appointments,
                               ConsultationRepository consultations,
                               PrescriptionRepository prescriptions,
                               InvoiceRepository invoices,
                               @Value("${telemedecine.clinic.zone:Africa/Nouakchott}") String clinicZone) {
        this.accounts = accounts;
        this.patients = patients;
        this.doctors = doctors;
        this.verifications = verifications;
        this.appointments = appointments;
        this.consultations = consultations;
        this.prescriptions = prescriptions;
        this.invoices = invoices;
        this.clinicZone = ZoneId.of(clinicZone);
    }

    @Transactional(readOnly = true)
    public AdminMetricsDto metrics() {
        LocalDate today = LocalDate.now(clinicZone);
        LocalDate firstDay = today.minusDays(CHART_DAYS - 1L);
        Instant from = firstDay.atStartOfDay(clinicZone).toInstant();

        Map<LocalDate, Long> perDay = appointments.startsSince(from).stream()
            .collect(Collectors.groupingBy(
                i -> i.atZone(clinicZone).toLocalDate(), Collectors.counting()));
        List<AdminMetricsDto.DayCount> byDay = new ArrayList<>();
        for (LocalDate d = firstDay; !d.isAfter(today); d = d.plusDays(1)) {
            byDay.add(new AdminMetricsDto.DayCount(d, perDay.getOrDefault(d, 0L)));
        }

        return new AdminMetricsDto(
            accounts.count(),
            patients.count(),
            doctors.count(),
            doctors.countByVerifiedTrue(),
            verifications.countByStatus(VerificationCase.Status.PENDING),
            appointments.count(),
            appointments.countByStatus(Appointment.Status.SCHEDULED),
            appointments.countByStatus(Appointment.Status.COMPLETED),
            appointments.countByStatus(Appointment.Status.CANCELLED),
            consultations.count(),
            consultations.countByStatus(Consultation.Status.ACTIVE),
            prescriptions.count(),
            invoices.countByStatus(Invoice.Status.PAID) + invoices.countByStatus(Invoice.Status.REIMBURSED),
            invoices.countByStatus(Invoice.Status.PENDING),
            invoices.totalCollected(),
            "MRU",
            byDay
        );
    }
}
