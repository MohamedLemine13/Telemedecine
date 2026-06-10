package com.irt42.telemedecine.payment.application;

import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.notification.application.NotificationService;
import com.irt42.telemedecine.notification.domain.Notification;
import com.irt42.telemedecine.payment.api.dto.InvoiceDto;
import com.irt42.telemedecine.payment.api.dto.PaymentSummaryDto;
import com.irt42.telemedecine.payment.domain.Invoice;
import com.irt42.telemedecine.payment.infrastructure.InvoiceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Simulated billing. Invoices are derived lazily from completed appointments
 * (idempotent sync on read — no event plumbing to get out of sync with), then
 * the patient "pays" them with a mock method and the simulated insurance
 * reimburses a fixed share.
 */
@Service
public class PaymentService {

    /** Fallback consultation fee when the doctor never set one (MRU). */
    static final BigDecimal DEFAULT_FEE = new BigDecimal("500.00");
    /** Simulated national-insurance reimbursement share. */
    static final BigDecimal REIMBURSEMENT_RATE = new BigDecimal("0.70");

    private final InvoiceRepository invoices;
    private final AppointmentRepository appointments;
    private final NotificationService notifications;

    public PaymentService(InvoiceRepository invoices,
                          AppointmentRepository appointments,
                          NotificationService notifications) {
        this.invoices = invoices;
        this.appointments = appointments;
        this.notifications = notifications;
    }

    // ── Lists ────────────────────────────────────────────────────────────────
    @Transactional
    public List<InvoiceDto> listForPatient(UUID accountId) {
        syncInvoices(appointments.findByPatientAccountIdAndStatus(accountId, Appointment.Status.COMPLETED));
        return invoices.findByPatientAccountIdOrderByCreatedAtDesc(accountId)
            .stream().map(InvoiceDto::from).toList();
    }

    @Transactional
    public List<InvoiceDto> listForDoctor(UUID accountId) {
        syncInvoices(appointments.findByDoctorAccountIdAndStatus(accountId, Appointment.Status.COMPLETED));
        return invoices.findByDoctorAccountIdOrderByCreatedAtDesc(accountId)
            .stream().map(InvoiceDto::from).toList();
    }

    @Transactional
    public PaymentSummaryDto summaryForDoctor(UUID accountId) {
        return summarize(listForDoctor(accountId));
    }

    @Transactional
    public PaymentSummaryDto summaryForPatient(UUID accountId) {
        return summarize(listForPatient(accountId));
    }

    // ── Actions (patient) ────────────────────────────────────────────────────
    @Transactional
    public InvoiceDto pay(UUID patientAccountId, UUID invoiceId, String method) {
        Invoice inv = loadPatientInvoice(patientAccountId, invoiceId);
        if (inv.getStatus() != Invoice.Status.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Invoice is already settled");
        }
        inv.setStatus(Invoice.Status.PAID);
        inv.setMethod(method == null || method.isBlank() ? "MOCK_CARD" : method);
        inv.setPaidAt(Instant.now());
        notifications.notify(
            inv.getDoctor().getAccount().getId(),
            Notification.Type.INVOICE_PAID,
            "Invoice paid",
            "A patient settled an invoice of " + inv.getAmount() + " " + inv.getCurrency() + ".",
            "/doctor/payouts");
        return InvoiceDto.from(inv);
    }

    /** Simulated insurance: credits a fixed share of a paid invoice back. */
    @Transactional
    public InvoiceDto reimburse(UUID patientAccountId, UUID invoiceId) {
        Invoice inv = loadPatientInvoice(patientAccountId, invoiceId);
        if (inv.getStatus() != Invoice.Status.PAID) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Only a paid invoice can be reimbursed");
        }
        inv.setStatus(Invoice.Status.REIMBURSED);
        inv.setReimbursedAmount(
            inv.getAmount().multiply(REIMBURSEMENT_RATE).setScale(2, RoundingMode.HALF_UP));
        inv.setReimbursedAt(Instant.now());
        return InvoiceDto.from(inv);
    }

    // ── Internals ────────────────────────────────────────────────────────────

    /** Create the missing invoice rows for completed appointments. Idempotent. */
    private void syncInvoices(List<Appointment> completed) {
        for (Appointment a : completed) {
            if (invoices.findByAppointmentId(a.getId()).isPresent()) continue;
            Invoice inv = new Invoice();
            inv.setAppointmentId(a.getId());
            inv.setAppointmentStartAt(a.getStartAt());
            inv.setDoctor(a.getDoctor());
            inv.setPatient(a.getPatient());
            BigDecimal fee = a.getDoctor().getConsultationFee();
            inv.setAmount(fee == null || fee.signum() <= 0 ? DEFAULT_FEE : fee);
            inv.setCurrency(a.getDoctor().getCurrency() == null ? "MRU" : a.getDoctor().getCurrency());
            invoices.save(inv);
        }
    }

    private Invoice loadPatientInvoice(UUID accountId, UUID invoiceId) {
        Invoice inv = invoices.findById(invoiceId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found"));
        if (!inv.getPatient().getAccount().getId().equals(accountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Invoice not found");
        }
        return inv;
    }

    private static PaymentSummaryDto summarize(List<InvoiceDto> list) {
        BigDecimal billed = BigDecimal.ZERO, paid = BigDecimal.ZERO, reimbursed = BigDecimal.ZERO;
        long pending = 0;
        String currency = "MRU";
        for (InvoiceDto i : list) {
            billed = billed.add(i.amount());
            currency = i.currency();
            switch (i.status()) {
                case "PAID" -> paid = paid.add(i.amount());
                case "REIMBURSED" -> {
                    paid = paid.add(i.amount());
                    if (i.reimbursedAmount() != null) reimbursed = reimbursed.add(i.reimbursedAmount());
                }
                default -> pending++;
            }
        }
        return new PaymentSummaryDto(billed, paid, reimbursed, pending, currency);
    }
}
