package com.irt42.telemedecine.consultation.api.dto;

import jakarta.validation.constraints.Size;

public record UpdateNoteRequest(
    @Size(max = 20000) String body
) {}
