package com.irt42.telemedecine.common.web;

import com.irt42.telemedecine.auth.application.AuthErrors;
import com.irt42.telemedecine.common.ApiError;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.time.Instant;
import java.util.List;

/**
 * Maps domain + framework exceptions to RFC 7807 {@link ApiError} bodies.
 * Keeps response shape consistent for the OpenAPI-generated client.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(AuthErrors.EmailAlreadyRegistered.class)
    public ResponseEntity<ApiError> handle(AuthErrors.EmailAlreadyRegistered e, HttpServletRequest req) {
        return error(HttpStatus.CONFLICT, "Email already registered", e.getMessage(), req, null);
    }

    @ExceptionHandler({AuthErrors.InvalidCredentials.class, BadCredentialsException.class})
    public ResponseEntity<ApiError> handle(RuntimeException e, HttpServletRequest req) {
        return error(HttpStatus.UNAUTHORIZED, "Invalid credentials", e.getMessage(), req, null);
    }

    @ExceptionHandler(AuthErrors.AccountInactive.class)
    public ResponseEntity<ApiError> handle(AuthErrors.AccountInactive e, HttpServletRequest req) {
        return error(HttpStatus.FORBIDDEN, "Account inactive", e.getMessage(), req, null);
    }

    @ExceptionHandler(AuthErrors.InvalidRefreshToken.class)
    public ResponseEntity<ApiError> handle(AuthErrors.InvalidRefreshToken e, HttpServletRequest req) {
        return error(HttpStatus.UNAUTHORIZED, "Invalid refresh token", e.getMessage(), req, null);
    }

    @ExceptionHandler(AuthErrors.TfaCodeInvalid.class)
    public ResponseEntity<ApiError> handle(AuthErrors.TfaCodeInvalid e, HttpServletRequest req) {
        return error(HttpStatus.UNAUTHORIZED, "2FA code invalid", e.getMessage(), req, null);
    }

    @ExceptionHandler({AuthErrors.TfaAlreadyEnrolled.class, AuthErrors.TfaNotEnrolled.class})
    public ResponseEntity<ApiError> handle409(RuntimeException e, HttpServletRequest req) {
        return error(HttpStatus.CONFLICT, "2FA state conflict", e.getMessage(), req, null);
    }

    @ExceptionHandler(AuthErrors.UnknownRole.class)
    public ResponseEntity<ApiError> handle(AuthErrors.UnknownRole e, HttpServletRequest req) {
        return error(HttpStatus.BAD_REQUEST, "Unknown role", e.getMessage(), req, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handle(MethodArgumentNotValidException e, HttpServletRequest req) {
        List<ApiError.FieldViolation> violations = e.getBindingResult().getFieldErrors().stream()
            .map(f -> new ApiError.FieldViolation(f.getField(), f.getDefaultMessage()))
            .toList();
        return error(HttpStatus.BAD_REQUEST, "Validation failed", "Request body failed validation", req, violations);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiError> handle(AuthenticationException e, HttpServletRequest req) {
        return error(HttpStatus.UNAUTHORIZED, "Unauthorized", e.getMessage(), req, null);
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<ApiError> handle(AccessDeniedException e, HttpServletRequest req) {
        return error(HttpStatus.FORBIDDEN, "Forbidden", e.getMessage(), req, null);
    }

    /**
     * Spring 6 raises {@link NoResourceFoundException} when no controller
     * matches a request — translate to 404 instead of letting the fallback
     * turn it into 500.
     */
    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiError> handle(NoResourceFoundException e, HttpServletRequest req) {
        return error(HttpStatus.NOT_FOUND, "Not found", "No resource matches " + req.getRequestURI(), req, null);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleFallback(Exception e, HttpServletRequest req) {
        log.error("Unhandled exception at {}", req.getRequestURI(), e);
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "Internal server error",
                     "An unexpected error occurred", req, null);
    }

    private static ResponseEntity<ApiError> error(HttpStatus status,
                                                  String title,
                                                  String detail,
                                                  HttpServletRequest req,
                                                  List<ApiError.FieldViolation> violations) {
        ApiError body = new ApiError(
            "about:blank",
            title,
            status.value(),
            detail,
            req.getRequestURI(),
            Instant.now(),
            req.getHeader("X-Request-Id"),
            violations
        );
        return ResponseEntity.status(status).body(body);
    }
}
