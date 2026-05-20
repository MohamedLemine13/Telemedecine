package com.irt42.telemedecine.storage;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "telemedecine.storage")
public record StorageProperties(
    @NotBlank String root,
    @Min(1) int maxFileSizeMb
) {}
