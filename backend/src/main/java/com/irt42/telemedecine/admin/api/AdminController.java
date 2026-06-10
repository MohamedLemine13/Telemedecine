package com.irt42.telemedecine.admin.api;

import com.irt42.telemedecine.admin.api.dto.AccountSummaryDto;
import com.irt42.telemedecine.admin.api.dto.AdminMetricsDto;
import com.irt42.telemedecine.admin.api.dto.NotifyRequest;
import com.irt42.telemedecine.admin.application.AccountAdminService;
import com.irt42.telemedecine.admin.application.AdminMetricsService;
import com.irt42.telemedecine.auth.domain.RoleCode;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** Platform metrics + account management, admin-only. */
@RestController
@RequestMapping("/api/admin")
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminMetricsService metrics;
    private final AccountAdminService accountAdmin;

    public AdminController(AdminMetricsService metrics, AccountAdminService accountAdmin) {
        this.metrics = metrics;
        this.accountAdmin = accountAdmin;
    }

    @GetMapping("/metrics")
    public AdminMetricsDto metrics() {
        return metrics.metrics();
    }

    @GetMapping("/accounts")
    public Page<AccountSummaryDto> accounts(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) RoleCode role,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        return accountAdmin.list(q, role, page, size);
    }

    @PostMapping("/accounts/{id}/suspend")
    public AccountSummaryDto suspend(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        return accountAdmin.suspend(subject(jwt), id);
    }

    @PostMapping("/accounts/{id}/activate")
    public AccountSummaryDto activate(@PathVariable UUID id) {
        return accountAdmin.activate(id);
    }

    /** Send a notification to a single account. */
    @PostMapping("/accounts/{id}/notify")
    public void notifyOne(@PathVariable UUID id, @RequestBody @Valid NotifyRequest req) {
        accountAdmin.message(id, req.title(), req.body());
    }

    /** Broadcast a notification to every account holding {@code role} (or all when omitted). */
    @PostMapping("/notifications/broadcast")
    public Map<String, Integer> broadcast(@RequestParam(required = false) RoleCode role,
                                          @RequestBody @Valid NotifyRequest req) {
        return Map.of("sent", accountAdmin.broadcast(role, req.title(), req.body()));
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
