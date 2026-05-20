package com.irt42.telemedecine.auth.api.dto;

/**
 * Issued by /login when 2FA is enabled. The client must call /2fa/verify with
 * this token as bearer + a TOTP code to receive the actual access/refresh pair.
 */
public record TfaChallengeResponse(String challengeToken, String purpose) {
    public static TfaChallengeResponse of(String token) {
        return new TfaChallengeResponse(token, "tfa_challenge");
    }
}
