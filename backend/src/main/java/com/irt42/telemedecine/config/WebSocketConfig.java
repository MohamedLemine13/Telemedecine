package com.irt42.telemedecine.config;

import com.irt42.telemedecine.consultation.infrastructure.ws.ChatSocketHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

/**
 * Plain (non-STOMP) WebSocket endpoint for real-time chat. {@code /ws/**} is on
 * the security allow-list — authentication happens inside the handshake (JWT in
 * the query string) because browsers cannot attach Authorization headers to
 * WebSocket upgrades. nginx proxies {@code /ws} with upgrade headers set.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final ChatSocketHandler chatSocketHandler;

    public WebSocketConfig(ChatSocketHandler chatSocketHandler) {
        this.chatSocketHandler = chatSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(chatSocketHandler, "/ws/chat")
            .setAllowedOriginPatterns("*");   // same-origin in prod via nginx; * keeps dev simple
    }
}
