package com.irt42.telemedecine.payment.api;

import com.irt42.telemedecine.payment.api.dto.InvoiceDto;
import com.irt42.telemedecine.payment.api.dto.PaymentSummaryDto;
import com.irt42.telemedecine.payment.application.PaymentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService service;

    public PaymentController(PaymentService service) { this.service = service; }

    /** Role-aware: a patient sees invoices to pay, a doctor the invoices earned. */
    @GetMapping("/invoices")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public List<InvoiceDto> invoices(JwtAuthenticationToken jwt) {
        return hasRole(jwt, "ROLE_DOCTOR")
            ? service.listForDoctor(subject(jwt))
            : service.listForPatient(subject(jwt));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public PaymentSummaryDto summary(JwtAuthenticationToken jwt) {
        return hasRole(jwt, "ROLE_DOCTOR")
            ? service.summaryForDoctor(subject(jwt))
            : service.summaryForPatient(subject(jwt));
    }

    @PostMapping("/invoices/{id}/pay")
    @PreAuthorize("hasRole('PATIENT')")
    public InvoiceDto pay(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.pay(subject(jwt), id);
    }

    @PostMapping("/invoices/{id}/request-reimbursement")
    @PreAuthorize("hasRole('PATIENT')")
    public InvoiceDto requestReimbursement(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.requestReimbursement(subject(jwt), id);
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }

    private static boolean hasRole(JwtAuthenticationToken jwt, String role) {
        return AuthorityUtils.authorityListToSet(jwt.getAuthorities()).contains(role);
    }
}
