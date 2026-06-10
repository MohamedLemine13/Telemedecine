package com.irt42.telemedecine.admin.application;

import com.irt42.telemedecine.admin.api.dto.AccountSummaryDto;
import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.AccountStatus;
import com.irt42.telemedecine.auth.domain.Role;
import com.irt42.telemedecine.auth.domain.RoleCode;
import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.auth.infrastructure.RefreshTokenRepository;
import com.irt42.telemedecine.notification.application.NotificationService;
import com.irt42.telemedecine.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Admin operations on user accounts: browse, suspend / reactivate, and send a
 * notification (in-app + email). Suspension revokes every active refresh token
 * so the user is signed out everywhere within one access-token TTL.
 */
@Service
public class AccountAdminService {

    private final AccountRepository accounts;
    private final RefreshTokenRepository refreshTokens;
    private final NotificationService notifications;

    public AccountAdminService(AccountRepository accounts,
                               RefreshTokenRepository refreshTokens,
                               NotificationService notifications) {
        this.accounts = accounts;
        this.refreshTokens = refreshTokens;
        this.notifications = notifications;
    }

    @Transactional(readOnly = true)
    public Page<AccountSummaryDto> list(String q, RoleCode role, int page, int size) {
        return accounts
            .searchForAdmin(emptyToNull(q), role, PageRequest.of(page, Math.min(size, 100)))
            .map(AccountSummaryDto::from);
    }

    @Transactional
    public AccountSummaryDto suspend(UUID adminAccountId, UUID accountId) {
        Account a = load(accountId);
        if (a.getId().equals(adminAccountId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You cannot suspend your own account");
        }
        if (isAdmin(a)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Admin accounts cannot be suspended");
        }
        a.setStatus(AccountStatus.SUSPENDED);
        refreshTokens.revokeAllActive(a, Instant.now());
        notifications.notify(a.getId(), Notification.Type.ADMIN_MESSAGE,
            "Account suspended",
            "Your account was suspended by an administrator. Contact support for details.",
            null);
        return AccountSummaryDto.from(a);
    }

    @Transactional
    public AccountSummaryDto activate(UUID accountId) {
        Account a = load(accountId);
        a.setStatus(AccountStatus.ACTIVE);
        notifications.notify(a.getId(), Notification.Type.ADMIN_MESSAGE,
            "Account reactivated",
            "Your account is active again — you can sign in normally.",
            null);
        return AccountSummaryDto.from(a);
    }

    /** Manual admin → user message (in-app + email mirror). */
    @Transactional
    public void message(UUID accountId, String title, String body) {
        Account a = load(accountId);   // 404 on unknown id before notifying
        notifications.notify(a.getId(), Notification.Type.ADMIN_MESSAGE, title, body, null);
    }

    /** Broadcast to every account holding a role (or all accounts when role is null). */
    @Transactional
    public int broadcast(RoleCode role, String title, String body) {
        List<Account> targets = accounts
            .searchForAdmin(null, role, PageRequest.of(0, 10_000))
            .getContent();
        for (Account a : targets) {
            notifications.notify(a.getId(), Notification.Type.ADMIN_MESSAGE, title, body, null);
        }
        return targets.size();
    }

    private Account load(UUID id) {
        return accounts.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found"));
    }

    private static boolean isAdmin(Account a) {
        return a.getRoles().stream().map(Role::getCode).anyMatch(c -> c == RoleCode.ROLE_ADMIN);
    }

    private static String emptyToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
