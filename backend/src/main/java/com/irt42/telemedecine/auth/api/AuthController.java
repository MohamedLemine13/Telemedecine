package com.irt42.telemedecine.auth.api;

import com.irt42.telemedecine.auth.api.dto.ChangePasswordRequest;
import com.irt42.telemedecine.auth.api.dto.LoginRequest;
import com.irt42.telemedecine.auth.api.dto.LoginResponse;
import com.irt42.telemedecine.auth.api.dto.RefreshRequest;
import com.irt42.telemedecine.auth.api.dto.SignupRequest;
import com.irt42.telemedecine.auth.api.dto.TfaChallengeResponse;
import com.irt42.telemedecine.auth.api.dto.TfaSetupResponse;
import com.irt42.telemedecine.auth.api.dto.TfaVerifyLoginRequest;
import com.irt42.telemedecine.auth.api.dto.TfaVerifyRequest;
import com.irt42.telemedecine.auth.api.dto.TokenResponse;
import com.irt42.telemedecine.auth.application.AuthErrors;
import com.irt42.telemedecine.auth.application.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService auth;
    private final JwtDecoder jwtDecoder;

    public AuthController(AuthService auth, JwtDecoder jwtDecoder) {
        this.auth = auth;
        this.jwtDecoder = jwtDecoder;
    }

    @PostMapping("/signup")
    public ResponseEntity<TokenResponse> signup(@RequestBody @Valid SignupRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(TokenResponse.from(auth.signup(req.email(), req.password(), req.role())));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody @Valid LoginRequest req) {
        AuthService.LoginOutcome outcome = auth.login(req.email(), req.password());
        return switch (outcome) {
            case AuthService.FullLogin full ->
                ResponseEntity.ok(LoginResponse.fullLogin(TokenResponse.from(full.tokens())));
            case AuthService.TfaChallenge ch ->
                ResponseEntity.ok(LoginResponse.tfaRequired(TfaChallengeResponse.of(ch.challengeToken())));
        };
    }

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(@RequestBody @Valid RefreshRequest req) {
        return ResponseEntity.ok(TokenResponse.from(auth.refresh(req.refreshToken())));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(@RequestBody @Valid RefreshRequest req) {
        auth.logout(req.refreshToken());
        return ResponseEntity.noContent().build();
    }

    // ── 2FA ─────────────────────────────────────────────────────────────────

    /** Step 1 of enrollment — caller is already authenticated. */
    @PostMapping("/2fa/setup")
    public ResponseEntity<TfaSetupResponse> beginTfa(JwtAuthenticationToken authn) {
        return ResponseEntity.ok(TfaSetupResponse.from(auth.beginTfaEnrollment(subject(authn))));
    }

    /** Step 2 of enrollment — confirm the first code, flip enabled=true. */
    @PostMapping("/2fa/enable")
    public ResponseEntity<TokenResponse> enableTfa(JwtAuthenticationToken authn,
                                                   @RequestBody @Valid TfaVerifyRequest req) {
        return ResponseEntity.ok(TokenResponse.from(auth.confirmTfaEnrollment(subject(authn), req.code())));
    }

    /** Login-time verification — bearer is NOT used; challenge JWT lives in the body. */
    @PostMapping("/2fa/verify")
    public ResponseEntity<TokenResponse> verifyTfaForLogin(@RequestBody @Valid TfaVerifyLoginRequest req) {
        Jwt challenge;
        try {
            challenge = jwtDecoder.decode(req.challengeToken());
        } catch (JwtException e) {
            throw new AuthErrors.InvalidCredentials();
        }
        if (!"tfa_challenge".equals(challenge.getClaimAsString("scope"))) {
            throw new AuthErrors.InvalidCredentials();
        }
        UUID accountId = UUID.fromString(challenge.getSubject());
        return ResponseEntity.ok(TokenResponse.from(auth.verifyTfa(accountId, req.code())));
    }

    @PostMapping("/2fa/disable")
    public ResponseEntity<Void> disableTfa(JwtAuthenticationToken authn,
                                           @RequestBody @Valid TfaVerifyRequest req) {
        auth.disableTfa(subject(authn), req.code());
        return ResponseEntity.noContent().build();
    }

    /** Change the signed-in user's password (revokes all refresh tokens). */
    @PostMapping("/password/change")
    public ResponseEntity<Void> changePassword(JwtAuthenticationToken authn,
                                               @RequestBody @Valid ChangePasswordRequest req) {
        auth.changePassword(subject(authn), req.currentPassword(), req.newPassword());
        return ResponseEntity.noContent().build();
    }

    private static UUID subject(JwtAuthenticationToken token) {
        return UUID.fromString(token.getToken().getSubject());
    }
}
