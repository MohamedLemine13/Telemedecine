package com.irt42.telemedecine.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end MockMvc flow exercising the Phase-1 auth happy path:
 *   signup → tokens
 *   login  → tokens (no 2FA yet)
 *   refresh→ rotated tokens (different from previous refresh)
 *
 * Spins up a real Postgres via Testcontainers + Flyway runs migrations.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

    @Container
    @ServiceConnection
    static final PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("telemedecine")
            .withUsername("telemed")
            .withPassword("test");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void signup_then_login_then_refresh() throws Exception {
        // ── signup ──────────────────────────────────────────────────────────
        String signupBody = """
            {"email":"alice@example.com","password":"Sup3rSafePass!","role":"ROLE_PATIENT"}
            """;
        String signupResp = mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON).content(signupBody))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.refreshToken").isNotEmpty())
            .andExpect(jsonPath("$.tokenType").value("Bearer"))
            .andReturn().getResponse().getContentAsString();
        JsonNode signupTokens = json.readTree(signupResp);

        // ── login ───────────────────────────────────────────────────────────
        String loginBody = """
            {"email":"alice@example.com","password":"Sup3rSafePass!"}
            """;
        String loginResp = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON).content(loginBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.tokens.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.tokens.refreshToken").isNotEmpty())
            .andReturn().getResponse().getContentAsString();
        JsonNode loginTokens = json.readTree(loginResp).get("tokens");

        // ── refresh ─────────────────────────────────────────────────────────
        String refreshBody = """
            {"refreshToken":"%s"}
            """.formatted(loginTokens.get("refreshToken").asText());
        String refreshResp = mvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON).content(refreshBody))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.accessToken").isNotEmpty())
            .andExpect(jsonPath("$.refreshToken").isNotEmpty())
            .andReturn().getResponse().getContentAsString();
        JsonNode refreshTokens = json.readTree(refreshResp);

        // The rotated refresh token must differ from the one we presented.
        assertThat(refreshTokens.get("refreshToken").asText())
            .isNotEqualTo(loginTokens.get("refreshToken").asText());

        // Re-using the old refresh token after rotation must fail (theft signal).
        mvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON).content(refreshBody))
            .andExpect(status().isUnauthorized());

        // Sanity: the signup tokens still work for their own refresh.
        String fromSignupRefresh = """
            {"refreshToken":"%s"}
            """.formatted(signupTokens.get("refreshToken").asText());
        mvc.perform(post("/api/auth/refresh")
                .contentType(MediaType.APPLICATION_JSON).content(fromSignupRefresh))
            .andExpect(status().isOk());
    }

    @Test
    void signup_duplicate_email_returns_409() throws Exception {
        String body = """
            {"email":"dup@example.com","password":"Sup3rSafePass!","role":"ROLE_DOCTOR"}
            """;
        mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isCreated());
        mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON).content(body))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.title").value("Email already registered"));
    }

    @Test
    void login_with_wrong_password_returns_401() throws Exception {
        mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"bob@example.com","password":"Sup3rSafePass!","role":"ROLE_PATIENT"}
                    """))
            .andExpect(status().isCreated());

        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"bob@example.com","password":"wrong-password"}
                    """))
            .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.title").value("Invalid credentials"));
    }

    @Test
    void signup_with_admin_role_is_rejected() throws Exception {
        mvc.perform(post("/api/auth/signup")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"would-be-admin@example.com","password":"Sup3rSafePass!","role":"ROLE_ADMIN"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Unknown role"));
    }
}
