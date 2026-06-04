package com.irt42.telemedecine.consultation.api.dto;

import java.util.UUID;

/**
 * Everything the frontend needs to connect to the LiveKit room. The client uses
 * {@code livekitUrl} + {@code token}; the rest drives the in-call UI.
 */
public record JoinResponse(
    UUID consultationId,
    UUID appointmentId,
    String roomName,
    String livekitUrl,
    String token,
    String identity,
    String role,            // PATIENT or DOCTOR (the caller's side)
    String selfName,
    String counterpartName,
    String mode             // VIDEO or PHONE
) {}
