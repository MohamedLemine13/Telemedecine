package com.irt42.telemedecine.auth.application;

import com.irt42.telemedecine.auth.domain.Account;
import com.irt42.telemedecine.auth.domain.Role;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;

/**
 * Issues short-lived access tokens and short-lived 2FA challenge tokens.
 * Refresh tokens are NOT JWTs — they're opaque server-side records (see
 * {@link RefreshTokenService}).
 *
 * <p>Decoding is done by Spring Security's resource-server JwtDecoder bean,
 * wired in SecurityConfig; this class only signs.
 */
@Service
public class JwtService {

    private final JwtProperties props;
    private final MACSigner signer;

    public JwtService(JwtProperties props) throws JOSEException {
        this.props = props;
        this.signer = new MACSigner(props.secret().getBytes());
    }

    /**
     * Full access token issued after a successful login (including 2FA when enabled).
     * Subject = account id (UUID), `roles` claim carries role codes for the
     * JwtAuthenticationConverter to translate into GrantedAuthority.
     */
    public String issueAccessToken(Account account) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(props.accessTtlSeconds());

        List<String> roles = account.getRoles().stream().map(Role::getCode).map(Enum::name).toList();

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .issuer(props.issuer())
            .subject(account.getId().toString())
            .jwtID(UUID.randomUUID().toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(expiry))
            .claim("roles", roles)
            .claim("tfa_verified", true)
            .claim("email", account.getEmail())
            .build();

        return sign(claims);
    }

    /**
     * Short-lived (5 min) intermediate token issued when the user has 2FA
     * enabled and provided correct password — they must now submit a TOTP /
     * OTP to {@code POST /api/auth/2fa/verify} to swap this for full tokens.
     */
    public String issueTfaChallenge(Account account) {
        Instant now = Instant.now();
        Instant expiry = now.plusSeconds(300);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .issuer(props.issuer())
            .subject(account.getId().toString())
            .jwtID(UUID.randomUUID().toString())
            .issueTime(Date.from(now))
            .expirationTime(Date.from(expiry))
            .claim("scope", "tfa_challenge")
            .build();

        return sign(claims);
    }

    private String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(),
                claims
            );
            jwt.sign(signer);
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to sign JWT", e);
        }
    }
}
