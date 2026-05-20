package com.irt42.telemedecine;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/**
 * Smoke test: verifies the Spring context loads end-to-end against a real
 * Postgres container, that Flyway runs the baseline migration, and that
 * JPA validates the mapped entities against the migrated schema.
 *
 * <p>This is the canary that catches misalignments between {@code BaseEntity}
 * (and any future entity) and the SQL migrations.
 */
@SpringBootTest
@Testcontainers
@ActiveProfiles("test")
class TelemedecineApplicationTests {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("telemedecine")
            .withUsername("telemed")
            .withPassword("test");

    @Test
    void contextLoads() {
        // If the application context fails to start, this test fails.
    }
}
