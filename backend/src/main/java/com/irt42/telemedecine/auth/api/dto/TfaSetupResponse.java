package com.irt42.telemedecine.auth.api.dto;

import com.irt42.telemedecine.auth.application.TotpService;

/**
 * Returned by /2fa/setup. The client renders {@code provisioningUri} as a
 * QR code (use any client-side QR library — the URI is the authoritative
 * source the authenticator app needs).
 */
public record TfaSetupResponse(String secret, String provisioningUri) {
    public static TfaSetupResponse from(TotpService.Enrollment e) {
        return new TfaSetupResponse(e.secret(), e.provisioningUri());
    }
}
