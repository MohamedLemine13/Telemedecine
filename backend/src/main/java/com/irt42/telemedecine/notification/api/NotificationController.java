package com.irt42.telemedecine.notification.api;

import com.irt42.telemedecine.notification.api.dto.NotificationDto;
import com.irt42.telemedecine.notification.application.NotificationService;
import org.springframework.data.domain.Page;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

/** The caller's own notification feed (any signed-in role). */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService service;

    public NotificationController(NotificationService service) { this.service = service; }

    @GetMapping
    public Page<NotificationDto> list(JwtAuthenticationToken jwt,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return service.listMine(subject(jwt), page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount(JwtAuthenticationToken jwt) {
        return Map.of("count", service.unreadCount(subject(jwt)));
    }

    @PostMapping("/{id}/read")
    public void markRead(JwtAuthenticationToken jwt, @PathVariable UUID id) {
        service.markRead(subject(jwt), id);
    }

    @PostMapping("/read-all")
    public void markAllRead(JwtAuthenticationToken jwt) {
        service.markAllRead(subject(jwt));
    }

    private static UUID subject(JwtAuthenticationToken jwt) {
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
