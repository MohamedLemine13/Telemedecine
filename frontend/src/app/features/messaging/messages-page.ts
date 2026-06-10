import { DatePipe, LowerCasePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatSocket } from '../../core/api/chat-socket';
import { ChatMessageDto, ConsultationApi, ConversationDto } from '../../core/api/consultation.api';
import { AuthStore } from '../../core/auth/auth.store';
import { Card, EmptyState, PageHeader, StatusBadge } from '../../shared/ui';

/**
 * Secure doctor ↔ patient messaging. The left column lists every consultation
 * the user took part in; selecting one opens its thread. New messages arrive in
 * real time over the {@link ChatSocket} WebSocket, with a 5s polling fallback so
 * the thread stays correct even if the socket drops. Sending always goes through
 * REST (which persists then broadcasts). Used by both the patient and doctor
 * spaces — the backend scopes everything to the authenticated participant.
 */
@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [DatePipe, LowerCasePipe, FormsModule, Card, EmptyState, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Messages"
      subtitle="Secure conversations tied to your consultations." />

    <div class="grid gap-4 lg:grid-cols-[320px_1fr]">
      <!-- Conversation list -->
      <app-card>
        @if (loadingList()) {
          <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
        } @else if (conversations().length === 0) {
          <app-empty-state icon="💬" title="No conversations"
            description="A thread opens automatically once you start a consultation." />
        } @else {
          <ul class="space-y-1">
            @for (c of conversations(); track c.consultationId) {
              <li>
                <button type="button" class="convo"
                  [class.active]="active()?.consultationId === c.consultationId"
                  (click)="select(c)">
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-semibold text-sm truncate">{{ c.counterpartName }}</span>
                    @if (c.status === 'ACTIVE') {
                      <app-status-badge variant="success" label="Live" />
                    }
                  </div>
                  <p class="text-xs text-[color:var(--color-neutral-500)] truncate">
                    {{ c.lastMessage || 'No messages yet' }}
                  </p>
                </button>
              </li>
            }
          </ul>
        }
      </app-card>

      <!-- Thread -->
      <app-card>
        @if (!active()) {
          <app-empty-state icon="✉️" title="Select a conversation"
            description="Pick a thread on the left to read and reply." />
        } @else {
          <div class="thread">
            <div class="thread-head">
              <div>
                <p class="text-sm font-semibold">{{ active()!.counterpartName }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">
                  {{ active()!.mode | lowercase }} consultation · {{ active()!.startedAt | date:'d MMM yyyy' }}
                </p>
              </div>
              <span class="text-xs" [class.text-green]="socket.connected">
                {{ socket.connected ? '● live' : '○ polling' }}
              </span>
            </div>

            <div class="thread-body" #scroll>
              @if (loadingThread()) {
                <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
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
              <button type="submit" class="composer-send" [disabled]="!draft.trim() || sending()">
                Send
              </button>
            </form>
          </div>
        }
      </app-card>
    </div>
  `,
  styles: `
    .convo {
      width: 100%; text-align: left; padding: 10px 12px; border-radius: var(--radius-input);
      border: 1px solid transparent; cursor: pointer; background: transparent;
    }
    .convo:hover { background: var(--color-neutral-50); }
    .convo.active { background: var(--color-primary-50); border-color: var(--color-primary-200, #c7d2fe); }
    .thread { display: flex; flex-direction: column; height: 60vh; min-height: 420px; }
    .thread-head {
      display: flex; align-items: center; justify-content: space-between;
      padding-bottom: 12px; border-bottom: 1px solid var(--color-neutral-200);
    }
    .text-green { color: var(--color-success, #16a34a); }
    .thread-body { flex: 1; overflow-y: auto; padding: 14px 2px; display: flex; flex-direction: column; gap: 8px; }
    .msg { display: flex; }
    .msg.mine { justify-content: flex-end; }
    .bubble {
      max-width: 76%; padding: 8px 12px; border-radius: 14px;
      background: var(--color-neutral-100); color: var(--color-neutral-900);
    }
    .msg.mine .bubble { background: var(--color-primary-700); color: #fff; }
    .bubble .body { font-size: 0.84rem; white-space: pre-wrap; word-break: break-word; margin: 0; }
    .bubble .meta { font-size: 0.62rem; opacity: 0.7; margin: 3px 0 0; text-align: right; }
    .composer { display: flex; gap: 8px; padding-top: 12px; border-top: 1px solid var(--color-neutral-200); }
    .composer-input {
      flex: 1; height: 40px; padding: 0 14px; border-radius: 9999px;
      border: 1px solid var(--color-neutral-200); outline: 0; font-size: 0.85rem;
    }
    .composer-input:focus { border-color: var(--color-primary-700); }
    .composer-send {
      height: 40px; padding: 0 18px; border-radius: 9999px; border: 0; cursor: pointer;
      background: var(--color-primary-700); color: #fff; font-size: 0.85rem; font-weight: 600;
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

  private loadThread(initial: boolean): void {
    const c = this.active();
    if (!c) return;
    this.api.messages(c.consultationId).subscribe({
      next: list => {
        this.messages.set(list);
        if (initial) { this.loadingThread.set(false); this.scrollSoon(); }
      },
      error: () => { if (initial) this.loadingThread.set(false); }
    });
  }

  private ingest(m: ChatMessageDto): void {
    this.messages.update(list => list.some(x => x.id === m.id) ? list : [...list, m]);
    this.scrollSoon();
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
