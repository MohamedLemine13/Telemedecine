package com.irt42.telemedecine.auth.application;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

/**
 * Configuration backing the JWT issuer / decoder. Bound from
 * `telemedecine.jwt.*` in application.yml.
 */
@Validated
@ConfigurationProperties(prefix = "telemedecine.jwt")
public record JwtProperties(
    @NotBlank @Size(min = 32, message = "JWT secret must be at least 32 characters")
    String secret,

    @Min(60) long accessTtlSeconds,

    @Min(60) long refreshTtlSeconds,

    String issuer
) {
    public JwtProperties {
        if (issuer == null || issuer.isBlank()) {
            issuer = "telemedecine";
        }
    }
}
