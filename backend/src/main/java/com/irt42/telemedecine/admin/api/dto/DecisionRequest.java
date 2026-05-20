package com.irt42.telemedecine.admin.api.dto;

import jakarta.validation.constraints.Size;

public record DecisionRequest(@Size(max = 4000) String note) {}
