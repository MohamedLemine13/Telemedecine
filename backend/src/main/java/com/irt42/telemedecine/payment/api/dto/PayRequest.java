package com.irt42.telemedecine.payment.api.dto;

import jakarta.validation.constraints.Pattern;

public record PayRequest(
    @Pattern(regexp = "MOCK_CARD|MOCK_MOBILE_MONEY", message = "Unknown payment method")
    String method
) {}
