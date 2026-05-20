package com.irt42.telemedecine.auth.api.dto;

import jakarta.validation.constraints.NotBlank;

public record RefreshRequest(@NotBlank String refreshToken) {}
