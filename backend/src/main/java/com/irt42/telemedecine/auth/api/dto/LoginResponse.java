package com.irt42.telemedecine.auth.api.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

/**
 * Polymorphic response for /login.
 *   - If 2FA disabled: tokens populated, challengeToken null.
 *   - If 2FA enabled : challengeToken populated, tokens null (client posts
 *     {@link TfaVerifyLoginRequest} to /api/auth/2fa/verify).
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record LoginResponse(
    TokenResponse tokens,
    TfaChallengeResponse tfa
) {
    public static LoginResponse fullLogin(TokenResponse tokens)        { return new LoginResponse(tokens, null); }
    public static LoginResponse tfaRequired(TfaChallengeResponse tfa)  { return new LoginResponse(null, tfa); }
}
