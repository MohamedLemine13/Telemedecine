package com.irt42.telemedecine.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/**
 * Posted by the client after /login returns a tfa_challenge token.
 * Carries both the short-lived challenge JWT and the TOTP code.
 */
public record TfaVerifyLoginRequest(
    @NotBlank String challengeToken,
    @NotBlank @Pattern(regexp = "\\d{6}", message = "code must be 6 digits") String code
) {}
