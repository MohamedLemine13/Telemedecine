package com.irt42.telemedecine.doctor.events;

import java.util.UUID;

/**
 * Fired by DoctorService when a credential row is created. The admin module
 * listens to create or refresh a VerificationCase. Keeps the modules
 * decoupled — doctor doesn't import admin.
 */
public record CredentialUploadedEvent(UUID doctorId, UUID credentialId) {}
