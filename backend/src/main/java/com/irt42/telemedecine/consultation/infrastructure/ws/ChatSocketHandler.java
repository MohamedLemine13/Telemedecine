package com.irt42.telemedecine.consultation.infrastructure.ws;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.irt42.telemedecine.consultation.infrastructure.ConsultationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

/**
 * Real-time fan-out for consultation chat.
 *
 * <p>Clients connect to {@code /ws/chat?consultationId=…&token=…} (the JWT goes
 * in the query string because the browser WebSocket API cannot set headers).
 * The handshake validates the token and that the caller is a participant of
 * the consultation; afterwards the socket is <em>receive-only</em> from the
 * client's point of view — messages are still sent over REST (which persists
 * them), then {@link #broadcast} pushes the saved message to every open socket
 * of that room. REST polling remains as the fallback transport, so a dropped
 * socket degrades gracefully instead of losing chat.
 */
@Component
public class ChatSocketHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(ChatSocketHandler.class);

    private final ConsultationRepository consultations;
    private final JwtDecoder jwtDecoder;
    private final ObjectMapper json;

    /** consultationId → open sessions of both participants. */
    private final Map<UUID, Set<WebSocketSession>> rooms = new ConcurrentHashMap<>();

    public ChatSocketHandler(ConsultationRepository consultations,
                             JwtDecoder jwtDecoder,
                             ObjectMapper json) {
        this.consultations = consultations;
        this.jwtDecoder = jwtDecoder;
        this.json = json;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Map<String, String> q = queryParams(session);
        try {
            UUID consultationId = UUID.fromString(q.getOrDefault("consultationId", ""));
            Jwt jwt = jwtDecoder.decode(q.getOrDefault("token", ""));
            UUID accountId = UUID.fromString(jwt.getSubject());
            if (!consultations.isParticipant(consultationId, accountId)) {
                session.close(CloseStatus.POLICY_VIOLATION);
                return;
            }
            session.getAttributes().put("consultationId", consultationId);
            session.getAttributes().put("accountId", accountId);
            rooms.computeIfAbsent(consultationId, k -> new CopyOnWriteArraySet<>()).add(session);
        } catch (Exception e) {
            log.debug("Rejected chat socket: {}", e.getMessage());
            session.close(CloseStatus.POLICY_VIOLATION);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Object cid = session.getAttributes().get("consultationId");
        if (cid instanceof UUID id) {
            Set<WebSocketSession> set = rooms.get(id);
            if (set != null) {
                set.remove(session);
                if (set.isEmpty()) rooms.remove(id);
            }
        }
    }

    /** Push a payload (e.g. a saved ChatMessageDto) to every open socket of the room. */
    public void broadcast(UUID consultationId, Object payload) {
        Set<WebSocketSession> set = rooms.get(consultationId);
        if (set == null || set.isEmpty()) return;
        TextMessage msg;
        try {
            msg = new TextMessage(json.writeValueAsString(payload));
        } catch (Exception e) {
            log.warn("Could not serialise WS payload: {}", e.getMessage());
            return;
        }
        for (WebSocketSession s : set) {
            try {
                if (s.isOpen()) {
                    s.sendMessage(msg);
                }
            } catch (Exception e) {
                log.debug("WS send failed, dropping session: {}", e.getMessage());
            }
        }
    }

    /** Is this account currently connected to the room? Drives "notify only when offline". */
    public boolean isConnected(UUID consultationId, UUID accountId) {
        Set<WebSocketSession> set = rooms.get(consultationId);
        if (set == null) return false;
        return set.stream().anyMatch(s -> accountId.equals(s.getAttributes().get("accountId")));
    }

    private static Map<String, String> queryParams(WebSocketSession session) {
        if (session.getUri() == null) return Map.of();
        var multi = UriComponentsBuilder.fromUri(session.getUri()).build().getQueryParams();
        return multi.toSingleValueMap();
    }
}
