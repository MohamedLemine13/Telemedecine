package com.irt42.telemedecine.admin.api.dto;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.Role;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record AccountSummaryDto(
    UUID id,
    String email,
    String phone,
    List<String> roles,
    String status,
    boolean tfaEnabled,
    Instant createdAt
) {
    public static AccountSummaryDto from(Account a) {
        return new AccountSummaryDto(
            a.getId(),
            a.getEmail(),
            a.getPhone(),
            a.getRoles().stream().map(Role::getCode).map(Enum::name).sorted().toList(),
            a.getStatus().name(),
            a.isTfaEnabled(),
            a.getCreatedAt()
        );
    }
}
