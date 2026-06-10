package com.irt42.telemedecine.payment.api;

import com.irt42.telemedecine.payment.api.dto.InvoiceDto;
import com.irt42.telemedecine.payment.api.dto.PayRequest;
import com.irt42.telemedecine.payment.api.dto.PaymentSummaryDto;
import com.irt42.telemedecine.payment.application.PaymentService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final PaymentService service;

    public InvoiceController(PaymentService service) { this.service = service; }

    /** Role-aware list: a patient sees invoices to pay, a doctor sees earnings. */
    @GetMapping
    @PreAuthorize("hasAnyRole('PATIENT','DOCTOR')")
    public List<InvoiceDto> list(JwtAuthenticationToken jwt) {
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

    /** Simulated payment — flips the invoice to PAID, nothing is charged. */
    @PostMapping("/{id}/pay")
    @PreAuthorize("hasRole('PATIENT')")
    public InvoiceDto pay(JwtAuthenticationToken jwt, @PathVariable UUID id,
                          @RequestBody(required = false) @Valid PayRequest req) {
        return service.pay(subject(jwt), id, req == null ? null : req.method());
    }

    /** Simulated insurance reimbursement — credits 70% back on a paid invoice. */
    @PostMapping("/{id}/reimburse")
    @PreAuthorize("hasRole('PATIENT')")
    public InvoiceDto reimburse(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return service.reimburse(subject(jwt), id);
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }

    private static boolean hasRole(JwtAuthenticationToken jwt, String role) {
        return AuthorityUtils.authorityListToSet(jwt.getAuthorities()).contains(role);
    }
}
