package com.irt42.telemedecine.auth.application;

/**
 * Domain-specific exceptions thrown by AuthService. The global exception
 * handler maps each to an RFC-7807 response.
 */
public final class AuthErrors {

    public static final class EmailAlreadyRegistered extends RuntimeException {
        public EmailAlreadyRegistered(String email) { super("Email already registered: " + email); }
    }

    public static final class InvalidCredentials extends RuntimeException {
        public InvalidCredentials() { super("Invalid credentials"); }
    }

    public static final class AccountInactive extends RuntimeException {
        public AccountInactive(String status) { super("Account is " + status); }
    }

    public static final class InvalidRefreshToken extends RuntimeException {
        public InvalidRefreshToken() { super("Refresh token is invalid, expired, or revoked"); }
    }

    public static final class TfaRequired extends RuntimeException {
        public final String challengeToken;
        public TfaRequired(String challengeToken) {
            super("2FA verification required");
            this.challengeToken = challengeToken;
        }
    }

    public static final class TfaCodeInvalid extends RuntimeException {
        public TfaCodeInvalid() { super("2FA code invalid"); }
    }

    public static final class TfaAlreadyEnrolled extends RuntimeException {
        public TfaAlreadyEnrolled() { super("2FA already enrolled — disable first to re-enroll"); }
    }

    public static final class TfaNotEnrolled extends RuntimeException {
        public TfaNotEnrolled() { super("2FA is not enrolled"); }
    }

    public static final class UnknownRole extends RuntimeException {
        public UnknownRole(String role) { super("Unknown role: " + role); }
    }

    private AuthErrors() {}
}
