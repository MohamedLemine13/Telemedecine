import { Injectable, inject } from '@angular/core';

import { AuthStore } from '../auth/auth.store';
import { ChatMessageDto } from './consultation.api';

/**
 * Thin wrapper over the raw WebSocket at {@code /ws/chat}. The browser cannot
 * set Authorization headers on a WS handshake, so the access token rides in the
 * query string — the backend handler decodes it and checks participation before
 * accepting. The socket is receive-only: sending still goes through REST (which
 * persists, then broadcasts), so message delivery never depends on the socket
 * being up. When it is up, the other side sees messages instantly; when it is
 * not, the polling fallback in the page keeps things working.
 */
@Injectable({ providedIn: 'root' })
export class ChatSocket {
  private readonly auth = inject(AuthStore);
  private socket: WebSocket | null = null;
  private closedByUs = false;

  /**
   * Open a socket for one consultation. `onMessage` fires for each broadcast
   * chat message. Returns immediately; reconnection is the caller's concern
   * (the page re-opens on navigation).
   */
  connect(consultationId: string, onMessage: (m: ChatMessageDto) => void): void {
    this.disconnect();
    this.closedByUs = false;

    const token = this.auth.accessToken();
    if (!token) return;

    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${proto}://${window.location.host}/ws/chat`
      + `?consultationId=${encodeURIComponent(consultationId)}`
      + `&token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(url);
      this.socket = ws;
      ws.onmessage = (ev) => {
        try {
          onMessage(JSON.parse(ev.data) as ChatMessageDto);
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => { if (this.socket === ws) this.socket = null; };
      ws.onerror = () => { /* polling fallback covers this */ };
    } catch {
      this.socket = null;
    }
  }

  disconnect(): void {
    this.closedByUs = true;
    if (this.socket) {
      try { this.socket.close(); } catch { /* noop */ }
      this.socket = null;
    }
  }

  get connected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}
