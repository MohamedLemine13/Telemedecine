package com.irt42.telemedecine.auth.api.dto;

import com.irt42.telemedecine.auth.application.AuthService;

public record TokenResponse(
    String accessToken,
    String refreshToken,
    long accessExpiresIn,
    String tokenType
) {
    public static TokenResponse from(AuthService.Tokens t) {
        return new TokenResponse(t.accessToken(), t.refreshToken(), t.accessExpiresIn(), "Bearer");
    }
}
