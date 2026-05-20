package com.irt42.telemedecine.common;

import java.time.Instant;
import java.util.List;

/**
 * RFC 7807 Problem Details body.
 *
 * <p>Used by the global exception handler to keep error shape consistent across
 * every endpoint. Spring Boot 3 has built-in {@code ProblemDetail}; this record
 * is a stricter, code-named DTO that the OpenAPI generator can model cleanly.
 */
public record ApiError(
    String type,
    String title,
    int status,
    String detail,
    String instance,
    Instant timestamp,
    String requestId,
    List<FieldViolation> violations
) {
    public record FieldViolation(String field, String message) {}
}
