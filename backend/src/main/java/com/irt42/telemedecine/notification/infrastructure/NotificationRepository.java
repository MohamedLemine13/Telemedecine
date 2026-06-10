package com.irt42.telemedecine.notification.infrastructure;

import com.irt42.telemedecine.notification.domain.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    Page<Notification> findByAccountIdOrderByCreatedAtDesc(UUID accountId, Pageable pageable);

    long countByAccountIdAndReadFalse(UUID accountId);

    @Modifying
    @Query("update Notification n set n.read = true where n.accountId = :accountId and n.read = false")
    int markAllRead(@Param("accountId") UUID accountId);
}
