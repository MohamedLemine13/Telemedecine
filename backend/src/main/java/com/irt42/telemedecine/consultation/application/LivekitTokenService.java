package com.irt42.telemedecine.consultation.application;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Mints LiveKit access tokens. A LiveKit token is just a JWT signed (HS256) with
 * the API secret, carrying a {@code video} grant claim. We build it with Nimbus
 * directly rather than pulling the LiveKit server SDK — one fewer dependency for
 * a school project, and the token format is stable and simple.
 *
 * @see <a href="https://docs.livekit.io/home/get-started/authentication/">LiveKit auth</a>
 */
@Service
public class LivekitTokenService {

    private final String apiKey;
    private final MACSigner signer;

    public LivekitTokenService(
        @Value("${telemedecine.livekit.api-key}") String apiKey,
        @Value("${telemedecine.livekit.api-secret}") String apiSecret
    ) throws JOSEException {
        this.apiKey = apiKey;
        this.signer = new MACSigner(apiSecret.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * @param room     LiveKit room name (we derive it from the consultation)
     * @param identity unique participant identity (the account id)
     * @param name     display name shown to the other participant
     * @param ttl      seconds the token (and thus the join window) stays valid
     */
    public String mint(String room, String identity, String name, long ttlSeconds) {
        Instant now = Instant.now();

        // The video grant — join this one room, publish + subscribe + data.
        Map<String, Object> grant = new LinkedHashMap<>();
        grant.put("roomJoin", true);
        grant.put("room", room);
        grant.put("canPublish", true);
        grant.put("canSubscribe", true);
        grant.put("canPublishData", true);

        JWTClaimsSet claims = new JWTClaimsSet.Builder()
            .issuer(apiKey)              // LiveKit identifies the key pair by `iss`
            .subject(identity)
            .jwtID(UUID.randomUUID().toString())
            .issueTime(Date.from(now))
            .notBeforeTime(Date.from(now))
            .expirationTime(Date.from(now.plusSeconds(ttlSeconds)))
            .claim("name", name)
            .claim("video", grant)
            .build();

        try {
            SignedJWT jwt = new SignedJWT(
                new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(),
                claims
            );
            jwt.sign(signer);
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Failed to sign LiveKit token", e);
        }
    }
}
