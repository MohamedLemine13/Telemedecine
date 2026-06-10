package com.irt42.telemedecine.appointment.infrastructure;

import com.irt42.telemedecine.appointment.domain.Appointment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface AppointmentRepository extends JpaRepository<Appointment, UUID> {

    /** Live (non-cancelled) start instants for a doctor inside a window — used by slot computation. */
    @Query("""
        select a.startAt from Appointment a
        where a.doctor.id = :doctorId
          and a.status <> com.irt42.telemedecine.appointment.domain.Appointment$Status.CANCELLED
          and a.startAt >= :from and a.startAt < :to
        """)
    List<Instant> liveStartsInWindow(@Param("doctorId") UUID doctorId,
                                     @Param("from") Instant from,
                                     @Param("to") Instant to);

    boolean existsByDoctorIdAndStartAtAndStatusNot(UUID doctorId, Instant startAt, Appointment.Status status);

    // The `status = coalesce(:status, a.status)` idiom matches all rows when
    // :status is null while keeping the bind typed — Postgres can't infer the
    // type of a bare `:status is null` check, but coalesce against the column can.
    // The time window is always passed as concrete bounds (the service widens a
    // null range to [EPOCH, FAR_FUTURE]) for the same reason.
    @Query("""
        select a from Appointment a
        where a.patient.id = :patientId
          and a.status = coalesce(:status, a.status)
        order by a.startAt desc
        """)
    Page<Appointment> findForPatient(@Param("patientId") UUID patientId,
                                     @Param("status") Appointment.Status status,
                                     Pageable pageable);

    @Query("""
        select a from Appointment a
        where a.doctor.id = :doctorId
          and a.status = coalesce(:status, a.status)
          and a.startAt >= :from
          and a.startAt <  :to
        order by a.startAt asc
        """)
    Page<Appointment> findForDoctor(@Param("doctorId") UUID doctorId,
                                    @Param("status") Appointment.Status status,
                                    @Param("from") Instant from,
                                    @Param("to") Instant to,
                                    Pageable pageable);

    /** Completed appointments per side — invoice generation walks these. */
    List<Appointment> findByPatientAccountIdAndStatus(UUID accountId, Appointment.Status status);

    List<Appointment> findByDoctorAccountIdAndStatus(UUID accountId, Appointment.Status status);

    /** Everything a doctor ever had with anyone — the "My patients" view aggregates this. */
    List<Appointment> findByDoctorAccountIdOrderByStartAtDesc(UUID accountId);

    long countByStatus(Appointment.Status status);

    /** Raw start instants since a point in time — grouped per day in the metrics service. */
    @Query("select a.startAt from Appointment a where a.startAt >= :from")
    List<Instant> startsSince(@Param("from") Instant from);
}
