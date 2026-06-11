import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatSocket } from '../../core/api/chat-socket';
import { ChatMessageDto, ConsultationApi, ConversationDto } from '../../core/api/consultation.api';
import { AuthStore } from '../../core/auth/auth.store';
import { PageHeader } from '../../shared/ui';

/**
 * Secure doctor ↔ patient messaging, styled like a modern chat app
 * (WhatsApp / Instagram DM): a compact conversation rail on the left with
 * avatars + previews, and a large thread pane on the right. New messages arrive
 * in real time over the {@link ChatSocket} WebSocket, with a 5s polling fallback
 * so the thread stays correct even if the socket drops. Sending always goes
 * through REST (which persists then broadcasts). Used by both the patient and
 * doctor spaces — the backend scopes everything to the authenticated participant.
 */
@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [DatePipe, LowerCasePipe, FormsModule, PageHeader],
  template: `
    <app-page-header title="Messages"
      subtitle="Secure conversations tied to your consultations." />

    <div class="chat">
      <!-- Conversation rail -->
      <aside class="rail" [class.hidden-mobile]="active()">
        <div class="rail-search">
          <input type="text" [(ngModel)]="query" name="q" placeholder="🔍  Search conversations"
            autocomplete="off" />
        </div>
        @if (loadingList()) {
          <p class="hint">Loading…</p>
        } @else if (visibleConversations().length === 0) {
          <div class="empty-rail">
            <p class="text-2xl">💬</p>
            <p class="font-semibold text-sm mt-1">No conversations</p>
            <p class="text-xs text-[color:var(--color-neutral-500)]">
              A thread opens automatically once you start a consultation.
            </p>
          </div>
        } @else {
          <ul class="rail-list">
            @for (c of visibleConversations(); track c.consultationId) {
              <li>
                <button type="button" class="convo"
                  [class.active]="active()?.consultationId === c.consultationId"
                  (click)="select(c)">
                  <span class="avatar" [style.background]="avatarColor(c.counterpartName)">
                    {{ initials(c.counterpartName) }}
                    @if (c.status === 'ACTIVE') { <span class="presence"></span> }
                  </span>
                  <span class="convo-main">
                    <span class="convo-top">
                      <span class="convo-name">{{ c.counterpartName }}</span>
                      <span class="convo-time">{{ timeLabel(c.lastMessageAt || c.startedAt) }}</span>
                    </span>
                    <span class="convo-preview">{{ c.lastMessage || 'No messages yet' }}</span>
                  </span>
                </button>
              </li>
            }
          </ul>
        }
      </aside>

      <!-- Thread -->
      <section class="thread-wrap" [class.hidden-mobile]="!active()">
        @if (!active()) {
          <div class="thread-empty">
            <p class="text-3xl">✉️</p>
            <p class="font-semibold mt-2">Select a conversation</p>
            <p class="text-sm text-[color:var(--color-neutral-500)]">
              Pick a thread on the left to read and reply.
            </p>
          </div>
        } @else {
          <header class="thread-head">
            <button type="button" class="back" (click)="closeThread()" title="Back">←</button>
            <span class="avatar sm" [style.background]="avatarColor(active()!.counterpartName)">
              {{ initials(active()!.counterpartName) }}
            </span>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-semibold truncate">{{ active()!.counterpartName }}</p>
              <p class="text-xs text-[color:var(--color-neutral-500)] truncate">
                {{ active()!.mode | lowercase }} consultation · {{ active()!.startedAt | date:'d MMM yyyy' }}
              </p>
            </div>
            <span class="conn" [class.on]="socket.connected">
              {{ socket.connected ? '● live' : '○ polling' }}
            </span>
          </header>

          <div class="thread-body" #scroll>
            @if (loadingThread()) {
              <p class="hint">Loading…</p>
            } @else if (messages().length === 0) {
              <p class="py-8 text-center text-sm text-[color:var(--color-neutral-500)]">
                No messages yet. Say hello 👋
              </p>
            } @else {
              @for (m of messages(); track m.id) {
                <div class="msg" [class.mine]="isMine(m)">
                  <div class="bubble">
                    <p class="body">{{ m.body }}</p>
                    <p class="meta">{{ m.sentAt | date:'HH:mm' }}</p>
                  </div>
                </div>
              }
            }
          </div>

          <form class="composer" (ngSubmit)="send()">
            <input type="text" [(ngModel)]="draft" name="draft" autocomplete="off"
              placeholder="Type a message…" class="composer-input" />
            <button type="submit" class="composer-send" [disabled]="!draft.trim() || sending()"
              title="Send">➤</button>
          </form>
        }
      </section>
    </div>
  `,
  styles: `
    :host { display: block; }
    .chat {
      display: grid; grid-template-columns: 300px 1fr; gap: 0;
      height: calc(100vh - 190px); min-height: 460px;
      border: 1px solid var(--color-neutral-200); border-radius: var(--radius-card);
      overflow: hidden; background: var(--color-neutral-0);
    }
    @media (max-width: 820px) {
      .chat { grid-template-columns: 1fr; }
      .hidden-mobile { display: none !important; }
    }

    /* ── Rail ─────────────────────────────────────────────── */
    .rail { display: flex; flex-direction: column; border-right: 1px solid var(--color-neutral-200);
            background: var(--color-neutral-50); min-width: 0; }
    .rail-search { padding: 10px; border-bottom: 1px solid var(--color-neutral-200); }
    .rail-search input {
      width: 100%; height: 38px; padding: 0 12px; font-size: 0.82rem;
      border: 1px solid var(--color-neutral-200); border-radius: 9999px;
      background: var(--color-neutral-0); outline: 0;
    }
    .rail-search input:focus { border-color: var(--color-primary-700); }
    .rail-list { flex: 1; overflow-y: auto; padding: 6px; }
    .hint { padding: 16px; font-size: 0.82rem; color: var(--color-neutral-500); }
    .empty-rail { padding: 28px 16px; text-align: center; }

    .convo {
      width: 100%; display: flex; align-items: center; gap: 10px;
      padding: 9px 10px; border-radius: 12px; border: 0; cursor: pointer;
      background: transparent; text-align: left; transition: background .12s;
    }
    .convo:hover { background: var(--color-neutral-100); }
    .convo.active { background: var(--color-primary-50); }
    .convo-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .convo-top { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
    .convo-name { font-weight: 600; font-size: 0.86rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .convo-time { font-size: 0.66rem; color: var(--color-neutral-500); flex-shrink: 0; }
    .convo-preview { font-size: 0.76rem; color: var(--color-neutral-500); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    .avatar {
      position: relative; flex-shrink: 0; width: 42px; height: 42px; border-radius: 9999px;
      display: grid; place-items: center; color: #fff; font-weight: 700; font-size: 0.85rem;
    }
    .avatar.sm { width: 36px; height: 36px; font-size: 0.75rem; }
    .presence {
      position: absolute; right: -1px; bottom: -1px; width: 12px; height: 12px;
      border-radius: 9999px; background: var(--color-success, #16a34a); border: 2px solid var(--color-neutral-50);
    }

    /* ── Thread ───────────────────────────────────────────── */
    .thread-wrap { display: flex; flex-direction: column; min-width: 0;
      background:
        radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--color-neutral-300) 50%, transparent) 1px, transparent 0)
        0 0 / 22px 22px,
        var(--color-neutral-0);
    }
    .thread-empty { margin: auto; text-align: center; padding: 24px; }
    .thread-head {
      display: flex; align-items: center; gap: 10px; padding: 10px 14px;
      border-bottom: 1px solid var(--color-neutral-200); background: var(--color-neutral-0);
    }
    .back { display: none; border: 0; background: transparent; font-size: 1.2rem; cursor: pointer; padding: 0 4px; }
    @media (max-width: 820px) { .back { display: block; } }
    .conn { font-size: 0.68rem; color: var(--color-neutral-400); flex-shrink: 0; }
    .conn.on { color: var(--color-success, #16a34a); }

    .thread-body { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 6px; }
    .msg { display: flex; }
    .msg.mine { justify-content: flex-end; }
    .bubble {
      max-width: 72%; padding: 7px 11px; border-radius: 14px;
      background: var(--color-neutral-0); color: var(--color-neutral-900);
      box-shadow: 0 1px 1px rgba(0,0,0,.06); border-bottom-left-radius: 4px;
    }
    .msg.mine .bubble {
      background: var(--color-primary-700); color: #fff;
      border-bottom-left-radius: 14px; border-bottom-right-radius: 4px;
    }
    .bubble .body { font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; margin: 0; line-height: 1.4; }
    .bubble .meta { font-size: 0.6rem; opacity: 0.65; margin: 2px 0 0; text-align: right; }

    .composer { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--color-neutral-200);
                background: var(--color-neutral-0); }
    .composer-input {
      flex: 1; height: 42px; padding: 0 16px; border-radius: 9999px;
      border: 1px solid var(--color-neutral-200); outline: 0; font-size: 0.86rem;
      background: var(--color-neutral-50);
    }
    .composer-input:focus { border-color: var(--color-primary-700); background: var(--color-neutral-0); }
    .composer-send {
      width: 42px; height: 42px; border-radius: 9999px; border: 0; cursor: pointer;
      background: var(--color-primary-700); color: #fff; font-size: 1rem; flex-shrink: 0;
    }
    .composer-send:disabled { opacity: 0.5; cursor: not-allowed; }
  `
})
export class MessagesPage implements OnInit, OnDestroy {
  private readonly api = inject(ConsultationApi);
  private readonly auth = inject(AuthStore);
  protected readonly socket = inject(ChatSocket);

  protected readonly conversations = signal<ConversationDto[]>([]);
  protected readonly loadingList = signal(true);
  protected readonly active = signal<ConversationDto | null>(null);
  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected readonly loadingThread = signal(false);
  protected readonly sending = signal(false);
  protected draft = '';
  protected query = '';

  // Newest-activity-first list, filtered by the search box.
  protected readonly visibleConversations = computed(() => {
    const q = this.query.trim().toLowerCase();
    return this.conversations()
      .filter(c => !q || c.counterpartName.toLowerCase().includes(q)
        || (c.lastMessage ?? '').toLowerCase().includes(q))
      .slice()
      .sort((a, b) => (b.lastMessageAt || b.startedAt || '').localeCompare(a.lastMessageAt || a.startedAt || ''));
  });

  private poll: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.api.conversations().subscribe({
      next: list => { this.conversations.set(list); this.loadingList.set(false); },
      error: () => { this.conversations.set([]); this.loadingList.set(false); }
    });
  }

  ngOnDestroy(): void {
    this.stopThread();
  }

  protected select(c: ConversationDto): void {
    if (this.active()?.consultationId === c.consultationId) return;
    this.stopThread();
    this.active.set(c);
    this.messages.set([]);
    this.loadingThread.set(true);
    this.loadThread(true);

    // Real-time push + polling safety net.
    this.socket.connect(c.consultationId, (m) => this.ingest(m));
    this.poll = setInterval(() => this.loadThread(false), 5000);
  }

  protected closeThread(): void {
    this.stopThread();
    this.active.set(null);
  }

  private loadThread(initial: boolean): void {
    const c = this.active();
    if (!c) return;
    this.api.messages(c.consultationId).subscribe({
      next: list => {
        this.messages.set(list);
        if (list.length) this.bumpPreview(c.consultationId, list[list.length - 1]);
        if (initial) { this.loadingThread.set(false); this.scrollSoon(); }
      },
      error: () => { if (initial) this.loadingThread.set(false); }
    });
  }

  private ingest(m: ChatMessageDto): void {
    this.messages.update(list => list.some(x => x.id === m.id) ? list : [...list, m]);
    const c = this.active();
    if (c) this.bumpPreview(c.consultationId, m);
    this.scrollSoon();
  }

  /** Keep the rail preview/time in sync with the latest message of a thread. */
  private bumpPreview(consultationId: string, m: ChatMessageDto): void {
    this.conversations.update(list => list.map(c =>
      c.consultationId === consultationId
        ? { ...c, lastMessage: m.body, lastMessageAt: m.sentAt }
        : c));
  }

  protected send(): void {
    const c = this.active();
    const body = this.draft.trim();
    if (!c || !body) return;
    this.sending.set(true);
    this.api.send(c.consultationId, body).subscribe({
      next: m => { this.ingest(m); this.draft = ''; this.sending.set(false); },
      error: () => this.sending.set(false)
    });
  }

  protected isMine(m: ChatMessageDto): boolean {
    return m.senderAccountId === this.auth.user()?.id;
  }

  // ── Presentation helpers ──────────────────────────────────────────────────
  protected initials(name: string): string {
    const parts = (name || '?').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  /** Deterministic pleasant colour from the name, so each contact is recognisable. */
  protected avatarColor(name: string): string {
    let h = 0;
    for (const ch of (name || '')) h = (h * 31 + ch.charCodeAt(0)) % 360;
    return `hsl(${h}, 58%, 45%)`;
  }

  protected timeLabel(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const sameDay = d.toDateString() === now.toDateString();
    if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
  }

  private stopThread(): void {
    if (this.poll) { clearInterval(this.poll); this.poll = null; }
    this.socket.disconnect();
  }

  private scrollSoon(): void {
    setTimeout(() => {
      const el = document.querySelector('.thread-body');
      if (el) el.scrollTop = el.scrollHeight;
    }, 30);
  }
}
