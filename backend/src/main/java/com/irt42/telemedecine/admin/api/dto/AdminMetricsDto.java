package com.irt42.telemedecine.admin.api.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Platform-wide counters for the admin dashboard and reports. */
public record AdminMetricsDto(
    long accountsTotal,
    long patientsTotal,
    long doctorsTotal,
    long doctorsVerified,
    long verificationsPending,
    long appointmentsTotal,
    long appointmentsScheduled,
    long appointmentsCompleted,
    long appointmentsCancelled,
    long consultationsTotal,
    long consultationsActive,
    long prescriptionsTotal,
    long invoicesPaid,
    long invoicesPending,
    BigDecimal revenueCollected,
    String currency,
    List<DayCount> appointmentsByDay      // last 14 days, oldest first
) {
    public record DayCount(LocalDate date, long count) {}
}
