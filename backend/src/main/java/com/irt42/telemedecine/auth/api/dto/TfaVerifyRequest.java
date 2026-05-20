package com.irt42.telemedecine.auth.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record TfaVerifyRequest(
    @NotBlank @Pattern(regexp = "\\d{6}", message = "code must be 6 digits") String code
) {}
