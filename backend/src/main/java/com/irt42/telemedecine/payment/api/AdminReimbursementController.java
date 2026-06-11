package com.irt42.telemedecine.payment.api;

import com.irt42.telemedecine.payment.api.dto.InvoiceDto;
import com.irt42.telemedecine.payment.application.PaymentService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Admin queue to validate patient reimbursement claims. */
@RestController
@RequestMapping("/api/admin/reimbursements")
@PreAuthorize("hasRole('ADMIN')")
public class AdminReimbursementController {

    private final PaymentService service;

    public AdminReimbursementController(PaymentService service) { this.service = service; }

    @GetMapping
    public List<InvoiceDto> pending() {
        return service.listReimbursementRequests();
    }

    @PostMapping("/{id}/approve")
    public InvoiceDto approve(@PathVariable UUID id) {
        return service.approveReimbursement(id);
    }

    @PostMapping("/{id}/reject")
    public InvoiceDto reject(@PathVariable UUID id) {
        return service.rejectReimbursement(id);
    }
}
