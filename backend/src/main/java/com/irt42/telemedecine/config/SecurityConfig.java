package com.irt42.telemedecine.config;

import com.irt42.telemedecine.auth.application.JwtProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.web.SecurityFilterChain;

import javax.crypto.spec.SecretKeySpec;
import java.util.Collection;
import java.util.List;

/**
 * Security wiring.
 *
 * <p>HS256 JWT resource server. The JwtAuthenticationConverter maps the {@code
 * roles} claim onto Spring Security {@link GrantedAuthority}s so
 * {@code @PreAuthorize("hasRole('PATIENT')")} works in service methods.
 */
@Configuration
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authz -> authz
                .requestMatchers(
                    // Bootstrap endpoints — no auth.
                    "/api/auth/signup",
                    "/api/auth/login",
                    "/api/auth/refresh",
                    "/api/auth/2fa/verify",
                    "/api/auth/password/forgot",
                    "/api/auth/password/reset",
                    "/api/auth/oauth2/**",
                    // OpenAPI / Swagger UI / health probes — always open.
                    "/v3/api-docs/**",
                    "/swagger-ui.html",
                    "/swagger-ui/**",
                    "/actuator/health",
                    "/actuator/info",
                    "/ws/**"
                ).permitAll()
                // Public lookup data — specialties list. GET /api/doctors
                // (the search) stays authenticated for now since browsing
                // happens from signed-in shells anyway.
                .requestMatchers(org.springframework.http.HttpMethod.GET,
                    "/api/doctors/specialties"
                ).permitAll()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(jwt -> jwt
                .jwtAuthenticationConverter(jwtAuthenticationConverter())
            ));
        return http.build();
    }

    /**
     * BCrypt with strength 12 (~250 ms / hash on a modern CPU — slow enough
     * to discourage brute-force, fast enough to feel snappy at login).
     * Migration to Argon2id is tracked in SECURITY.md §2.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    /** HS256 decoder backed by the shared secret. */
    @Bean
    public JwtDecoder jwtDecoder(JwtProperties props) {
        SecretKeySpec key = new SecretKeySpec(props.secret().getBytes(), "HmacSHA256");
        return NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
    }

    /**
     * Maps the `roles` claim → GrantedAuthority entries directly (so
     * {@code @PreAuthorize("hasRole('PATIENT')")} matches ROLE_PATIENT).
     * Does NOT use the `scope`/`scp` claim — those are intentionally reserved
     * for the tfa_challenge token type.
     */
    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter inner = new JwtGrantedAuthoritiesConverter();
        inner.setAuthoritiesClaimName("roles");
        inner.setAuthorityPrefix(""); // role values already start with ROLE_
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(jwt -> {
            Collection<GrantedAuthority> base = inner.convert(jwt);
            return base == null ? List.<GrantedAuthority>of() : base.stream()
                .map(a -> (GrantedAuthority) new SimpleGrantedAuthority(a.getAuthority()))
                .toList();
        });
        return converter;
    }
}
