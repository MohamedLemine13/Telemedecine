package com.irt42.telemedecine.appointment.application;

import com.irt42.telemedecine.appointment.api.dto.RatingDto;
import com.irt42.telemedecine.appointment.domain.Appointment;
import com.irt42.telemedecine.appointment.domain.DoctorRating;
import com.irt42.telemedecine.appointment.infrastructure.AppointmentRepository;
import com.irt42.telemedecine.appointment.infrastructure.DoctorRatingRepository;
import com.irt42.telemedecine.doctor.domain.DoctorProfile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

/**
 * Doctor ratings. A patient may rate the doctor of one of their COMPLETED
 * appointments, exactly once. The doctor's denormalised aggregate
 * (rating_average / rating_count on doctor_profile) is updated incrementally so
 * search results can sort and display it without a join.
 */
@Service
public class RatingService {

    private final DoctorRatingRepository ratings;
    private final AppointmentRepository appointments;

    public RatingService(DoctorRatingRepository ratings, AppointmentRepository appointments) {
        this.ratings = ratings;
        this.appointments = appointments;
    }

    @Transactional
    public RatingDto rate(UUID patientAccountId, UUID appointmentId, int stars, String comment) {
        Appointment appt = appointments.findById(appointmentId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found"));
        if (!appt.getPatient().getAccount().getId().equals(patientAccountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Appointment not found");
        }
        if (appt.getStatus() != Appointment.Status.COMPLETED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You can only rate a completed consultation");
        }
        if (ratings.existsByAppointmentId(appointmentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This consultation was already rated");
        }

        DoctorRating r = new DoctorRating();
        r.setAppointmentId(appointmentId);
        r.setDoctor(appt.getDoctor());
        r.setPatient(appt.getPatient());
        r.setStars(stars);
        r.setComment(comment == null || comment.isBlank() ? null : comment.trim());
        ratings.save(r);

        // Incremental average on the managed doctor entity (JPA flushes on commit).
        DoctorProfile d = appt.getDoctor();
        int n = d.getRatingCount();
        BigDecimal old = d.getRatingAverage() == null ? BigDecimal.ZERO : d.getRatingAverage();
        BigDecimal newAvg = old.multiply(BigDecimal.valueOf(n))
            .add(BigDecimal.valueOf(stars))
            .divide(BigDecimal.valueOf(n + 1L), 2, RoundingMode.HALF_UP);
        d.setRatingCount(n + 1);
        d.setRatingAverage(newAvg);

        return new RatingDto(newAvg, n + 1);
    }
}
