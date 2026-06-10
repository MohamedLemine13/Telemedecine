package com.irt42.telemedecine.notification.application;

import com.irt42.telemedecine.auth.infrastructure.AccountRepository;
import com.irt42.telemedecine.notification.api.dto.NotificationDto;
import com.irt42.telemedecine.notification.domain.Notification;
import com.irt42.telemedecine.notification.infrastructure.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Creates in-app notifications and mirrors them to email (MailHog in dev).
 * Email is strictly best-effort: a down SMTP server must never fail the
 * business action that triggered the notification.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository notifications;
    private final AccountRepository accounts;
    private final JavaMailSender mail;

    public NotificationService(NotificationRepository notifications,
                               AccountRepository accounts,
                               JavaMailSender mail) {
        this.notifications = notifications;
        this.accounts = accounts;
        this.mail = mail;
    }

    /** Create an in-app notification and mirror it to the account's email. */
    @Transactional
    public Notification notify(UUID accountId, Notification.Type type,
                               String title, String body, String link) {
        Notification n = new Notification();
        n.setAccountId(accountId);
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setLink(link);
        Notification saved = notifications.save(n);
        sendEmailQuietly(accountId, title, body);
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<NotificationDto> listMine(UUID accountId, int page, int size) {
        return notifications
            .findByAccountIdOrderByCreatedAtDesc(accountId, PageRequest.of(page, Math.min(size, 100)))
            .map(NotificationDto::from);
    }

    @Transactional(readOnly = true)
    public long unreadCount(UUID accountId) {
        return notifications.countByAccountIdAndReadFalse(accountId);
    }

    @Transactional
    public void markRead(UUID accountId, UUID notificationId) {
        Notification n = notifications.findById(notificationId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));
        if (!n.getAccountId().equals(accountId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found");
        }
        n.setRead(true);
    }

    @Transactional
    public void markAllRead(UUID accountId) {
        notifications.markAllRead(accountId);
    }

    private void sendEmailQuietly(UUID accountId, String subject, String body) {
        try {
            accounts.findById(accountId).ifPresent(account -> {
                SimpleMailMessage msg = new SimpleMailMessage();
                msg.setFrom("no-reply@telemedecine.local");
                msg.setTo(account.getEmail());
                msg.setSubject("[Telemedecine] " + subject);
                msg.setText(body == null ? subject : body);
                mail.send(msg);
            });
        } catch (Exception e) {
            log.warn("Email mirror for notification failed (in-app copy is saved): {}", e.getMessage());
        }
    }
}
