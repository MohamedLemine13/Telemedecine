package com.irt42.telemedecine.payment.api.dto;

import java.math.BigDecimal;

/**
 * Aggregate money view. For a doctor: what they earned; for a patient: what
 * they spent and got back from the simulated insurance.
 */
public record PaymentSummaryDto(
    BigDecimal totalBilled,
    BigDecimal totalPaid,
    BigDecimal totalReimbursed,
    long pendingInvoices,
    String currency
) {}
