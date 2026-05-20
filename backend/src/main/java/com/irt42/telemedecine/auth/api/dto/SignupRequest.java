package com.irt42.telemedecine.auth.api.dto;

import com.irt42.telemedecine.auth.domain.RoleCode;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignupRequest(
    @Email @NotBlank @Size(max = 320) String email,

    @NotBlank
    @Size(min = 12, max = 128, message = "Password must be 12–128 characters")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[a-z])(?=.*\\d).+$",
        message = "Password must contain upper, lower, and digit"
    )
    String password,

    @NotNull RoleCode role
) {}
