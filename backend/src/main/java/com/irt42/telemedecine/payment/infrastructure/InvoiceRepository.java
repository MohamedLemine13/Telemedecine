package com.irt42.telemedecine.payment.infrastructure;

import com.irt42.telemedecine.payment.domain.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InvoiceRepository extends JpaRepository<Invoice, UUID> {

    Optional<Invoice> findByAppointmentId(UUID appointmentId);

    List<Invoice> findByPatientAccountIdOrderByCreatedAtDesc(UUID accountId);

    List<Invoice> findByDoctorAccountIdOrderByCreatedAtDesc(UUID accountId);

    /** Platform-wide collected revenue (paid + reimbursed invoices). */
    @Query("""
        select coalesce(sum(i.amount), 0) from Invoice i
        where i.status <> com.irt42.telemedecine.payment.domain.Invoice$Status.PENDING
        """)
    BigDecimal totalCollected();

    long countByStatus(Invoice.Status status);
}
