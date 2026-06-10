package com.irt42.telemedecine.consultation.infrastructure;

import com.irt42.telemedecine.consultation.domain.Consultation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConsultationRepository extends JpaRepository<Consultation, UUID> {
    Optional<Consultation> findByAppointmentId(UUID appointmentId);

    /** Every consultation the account took part in, newest first — powers the Messages screens. */
    @Query("""
        select c from Consultation c
        where c.appointment.doctor.account.id  = :accountId
           or c.appointment.patient.account.id = :accountId
        order by c.startedAt desc
        """)
    List<Consultation> findAllForAccount(@Param("accountId") UUID accountId);

    long countByStatus(Consultation.Status status);

    /** Single-query participant check — used by the chat WebSocket handshake. */
    @Query("""
        select count(c) > 0 from Consultation c
        where c.id = :consultationId
          and (c.appointment.doctor.account.id  = :accountId
            or c.appointment.patient.account.id = :accountId)
        """)
    boolean isParticipant(@Param("consultationId") UUID consultationId,
                          @Param("accountId") UUID accountId);
}
