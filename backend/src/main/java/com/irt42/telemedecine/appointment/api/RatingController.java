package com.irt42.telemedecine.appointment.api;

import com.irt42.telemedecine.appointment.api.dto.RateRequest;
import com.irt42.telemedecine.appointment.api.dto.RatingDto;
import com.irt42.telemedecine.appointment.application.RatingService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

    private final RatingService service;

    public RatingController(RatingService service) { this.service = service; }

    /** Patient rates the doctor of one of their completed appointments. */
    @PostMapping
    @PreAuthorize("hasRole('PATIENT')")
    public RatingDto rate(JwtAuthenticationToken jwt, @RequestBody @Valid RateRequest req) {
        UUID patient = UUID.fromString(jwt.getToken().getSubject());
        return service.rate(patient, req.appointmentId(), req.stars(), req.comment());
    }
}
