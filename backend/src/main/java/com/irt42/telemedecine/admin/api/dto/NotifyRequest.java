package com.irt42.telemedecine.admin.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record NotifyRequest(
    @NotBlank @Size(max = 200) String title,
    @Size(max = 2000) String body
) {}
