import { Component, ElementRef, OnDestroy, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  RemoteTrack, Room, RoomEvent, Track
} from 'livekit-client';

import { ChatMessageDto, ConsultationApi, JoinResponse } from '../../core/api/consultation.api';
import { saveBlob } from '../../core/util/download';

type Phase = 'connecting' | 'live' | 'ended' | 'error';

@Component({
  selector: 'app-video-consultation-room',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="room">
      <!-- Stage -->
      <div class="stage">
        <header class="bar">
          <div>
            <p class="name">{{ join()?.counterpartName || 'Consultation' }}</p>
            <p class="sub">
              {{ phaseLabel() }}@if (join()?.mode === 'PHONE') { · audio only }
            </p>
          </div>
          <span class="dot" [class.on]="remoteConnected()"></span>
        </header>

        <div class="video-wrap">
          <!-- Remote (big) -->
          <video #remoteVideo class="remote" autoplay playsinline></video>
          @if (phase() === 'connecting') {
            <div class="waiting"><p class="text-lg font-semibold">Connecting…</p></div>
          } @else if (phase() === 'error') {
            <div class="waiting">
              <p class="text-lg font-semibold">Couldn't start the consultation</p>
              <p class="text-sm opacity-70">{{ errorMsg() }}</p>
              <button class="btn-ghost mt-3" (click)="leave()">Back</button>
            </div>
          } @else if (phase() === 'ended') {
            <div class="waiting">
              <p class="text-lg font-semibold">Call ended</p>
              @if (isDoctor()) {
                <div class="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <button class="btn-ghost" (click)="downloadReport()" [disabled]="downloading()">
                    {{ downloading() ? 'Preparing…' : '⬇ Report PDF' }}
                  </button>
                  <button class="btn-ghost" (click)="writePrescription()">℞ Write prescription</button>
                </div>
              }
              <button class="btn-primary mt-3" (click)="leave()">Done</button>
            </div>
          } @else if (videoError()) {
            <div class="waiting">
              <p class="text-lg font-semibold">Video unavailable</p>
              <p class="text-sm opacity-70">{{ videoError() }}</p>
              <p class="text-sm opacity-70">Chat still works — you can message on the right.</p>
            </div>
          } @else if (!remoteConnected()) {
            <div class="waiting">
              <p class="text-lg font-semibold">Waiting for {{ join()?.counterpartName }} to join…</p>
              <p class="text-sm opacity-70">They'll appear here once connected.</p>
            </div>
          }

          <!-- Local (PiP) -->
          <video #localVideo class="local" autoplay playsinline muted
                 [style.display]="camOn() && join()?.mode === 'VIDEO' ? 'block' : 'none'"></video>
        </div>

        <!-- Controls -->
        @if (phase() === 'live' && !videoError()) {
          <div class="controls">
            <button class="ctrl" [class.off]="!micOn()" (click)="toggleMic()" title="Microphone">
              {{ micOn() ? '🎙️' : '🔇' }}
            </button>
            @if (join()?.mode === 'VIDEO') {
              <button class="ctrl" [class.off]="!camOn()" (click)="toggleCam()" title="Camera">
                {{ camOn() ? '📹' : '🚫' }}
              </button>
            }
            <button class="ctrl end" (click)="endCall()" title="Leave">📞</button>
          </div>
        }
      </div>

      <!-- Side panel -->
      <aside class="panel">
        <div class="tabs">
          <button [class.active]="tab() === 'chat'" (click)="tab.set('chat')">Chat</button>
          @if (isDoctor()) {
            <button [class.active]="tab() === 'notes'" (click)="tab.set('notes')">Notes</button>
          }
        </div>

        @if (tab() === 'chat') {
          <div class="chat-list" #chatList>
            @for (m of messages(); track m.id) {
              <div class="msg" [class.mine]="m.senderAccountId === join()?.identity">
                <p class="msg-meta">{{ m.senderName }} · {{ m.sentAt | date:'HH:mm' }}</p>
                <p class="msg-body">{{ m.body }}</p>
              </div>
            } @empty {
              <p class="empty">No messages yet. Say hello 👋</p>
            }
          </div>
          <form class="chat-input" (submit)="$event.preventDefault(); sendMessage()">
            <input [(ngModel)]="draft" name="draft" placeholder="Type a message…" autocomplete="off" />
            <button type="submit" [disabled]="!draft.trim()">Send</button>
          </form>
        } @else {
          <div class="notes">
            <textarea [(ngModel)]="noteBody" name="note" (ngModelChange)="onNoteChange()"
              placeholder="Private clinical notes (only you can see these)…"></textarea>
            <p class="note-status">{{ noteStatus() }}</p>
          </div>
        }
      </aside>
    </div>
  `,
  styles: `
    :host { display: block; }
    .room { display: grid; grid-template-columns: 1fr 340px; gap: 16px; height: calc(100vh - 120px); min-height: 520px; }
    @media (max-width: 900px) { .room { grid-template-columns: 1fr; height: auto; } }

    .stage { display: flex; flex-direction: column; background: #0f172a; border-radius: var(--radius-card); overflow: hidden; }
    .bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; color: #fff; }
    .name { font-weight: 700; font-size: 0.95rem; }
    .sub { font-size: 0.75rem; opacity: 0.7; }
    .dot { width: 10px; height: 10px; border-radius: 9999px; background: #64748b; }
    .dot.on { background: var(--color-success); box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 25%, transparent); }

    .video-wrap { position: relative; flex: 1; background: #0b1220; min-height: 320px; }
    .remote { width: 100%; height: 100%; object-fit: contain; background: #0b1220; }
    .local { position: absolute; right: 12px; bottom: 12px; width: 168px; height: 112px; object-fit: cover;
             border-radius: 10px; border: 2px solid rgba(255,255,255,.25); background: #000; }
    .waiting { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; text-align: center; gap: 4px; }

    .controls { display: flex; align-items: center; justify-content: center; gap: 14px; padding: 14px; background: #0b1220; }
    .ctrl { width: 48px; height: 48px; border-radius: 9999px; border: none; background: #1e293b; color: #fff; font-size: 1.2rem; cursor: pointer; }
    .ctrl.off { background: #475569; }
    .ctrl.end { background: var(--color-error); transform: rotate(135deg); }

    .panel { display: flex; flex-direction: column; background: var(--color-neutral-0); border: 1px solid var(--color-neutral-200); border-radius: var(--radius-card); overflow: hidden; }
    .tabs { display: flex; border-bottom: 1px solid var(--color-neutral-200); }
    .tabs button { flex: 1; padding: 12px; font-size: 0.85rem; font-weight: 600; color: var(--color-neutral-500); background: transparent; border: none; cursor: pointer; }
    .tabs button.active { color: var(--color-primary-700); box-shadow: inset 0 -2px 0 var(--color-primary-700); }

    .chat-list { flex: 1; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
    .empty { margin: auto; color: var(--color-neutral-500); font-size: 0.85rem; }
    .msg { max-width: 85%; }
    .msg.mine { align-self: flex-end; text-align: right; }
    .msg-meta { font-size: 0.68rem; color: var(--color-neutral-500); margin-bottom: 2px; }
    .msg-body { display: inline-block; padding: 8px 12px; border-radius: 12px; font-size: 0.85rem;
                background: var(--color-neutral-50); }
    .msg.mine .msg-body { background: var(--color-primary-700); color: #fff; }

    .chat-input { display: flex; gap: 8px; padding: 12px; border-top: 1px solid var(--color-neutral-200); }
    .chat-input input { flex: 1; height: 40px; padding: 0 12px; border: 1px solid var(--color-neutral-200); border-radius: var(--radius-input); font-size: 0.85rem; }
    .chat-input button { height: 40px; padding: 0 16px; border: none; border-radius: var(--radius-input); background: var(--color-primary-700); color: #fff; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
    .chat-input button:disabled { opacity: .5; cursor: not-allowed; }

    .notes { flex: 1; display: flex; flex-direction: column; padding: 12px; }
    .notes textarea { flex: 1; resize: none; padding: 12px; border: 1px solid var(--color-neutral-200); border-radius: var(--radius-input); font-size: 0.85rem; line-height: 1.5; }
    .note-status { margin-top: 8px; font-size: 0.72rem; color: var(--color-neutral-500); height: 1em; }

    .btn-primary { padding: 8px 16px; border-radius: var(--radius-input); background: var(--color-primary-700); color: #fff; font-weight: 600; border: none; cursor: pointer; }
    .btn-ghost { padding: 8px 16px; border-radius: var(--radius-input); background: rgba(255,255,255,.15); color: #fff; border: none; cursor: pointer; }
  `
})
export class VideoConsultationRoom implements OnInit, OnDestroy {
  private readonly api = inject(ConsultationApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('localVideo') localVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('chatList') chatList?: ElementRef<HTMLDivElement>;

  protected readonly phase = signal<Phase>('connecting');
  protected readonly errorMsg = signal('');
  protected readonly join = signal<JoinResponse | null>(null);
  protected readonly remoteConnected = signal(false);
  protected readonly videoError = signal<string | null>(null);
  protected readonly micOn = signal(true);
  protected readonly camOn = signal(true);

  protected readonly tab = signal<'chat' | 'notes'>('chat');
  protected readonly messages = signal<ChatMessageDto[]>([]);
  protected draft = '';
  protected noteBody = '';
  protected readonly noteStatus = signal('');

  protected readonly isDoctor = computed(() => this.join()?.role === 'DOCTOR');
  protected phaseLabel = computed(() =>
    ({ connecting: 'Connecting…', live: 'Live', ended: 'Ended', error: 'Error' }[this.phase()]));

  private room?: Room;
  private appointmentId!: string;
  private pollTimer?: ReturnType<typeof setInterval>;
  private noteTimer?: ReturnType<typeof setTimeout>;
  private readonly audioEls: HTMLMediaElement[] = [];

  ngOnInit(): void {
    this.appointmentId = this.route.snapshot.paramMap.get('appointmentId')!;
    this.api.join(this.appointmentId).subscribe({
      next: j => { this.join.set(j); this.connect(j); },
      error: err => this.fail(err?.error?.detail ?? 'Could not start the consultation.')
    });
  }

  private async connect(j: JoinResponse): Promise<void> {
    // The session is live the moment we have a token: chat + notes work over
    // REST no matter what. LiveKit video is a best-effort layer on top, so a
    // camera/network failure degrades to "chat only" instead of killing the room.
    this.phase.set('live');
    this.startChatPolling();
    if (this.isDoctor()) this.loadNote();

    try {
      const room = await this.connectRoom(j);
      this.room = room;

      if (j.mode === 'VIDEO') {
        await room.localParticipant.enableCameraAndMicrophone();
        this.attachLocalCamera();
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }

      this.refreshRemotePresence();
      room.startAudio().catch(() => { /* autoplay may need a click; harmless */ });
    } catch (e: any) {
      this.videoError.set(e?.message ?? 'Camera/microphone or network unavailable.');
    }
  }

  /**
   * Try each candidate signalling URL in order until one connects. The backend
   * tells us where LiveKit lives (`livekitUrl`, from LIVEKIT_PUBLIC_URL); the
   * same-origin `/lk` nginx proxy is the fallback that always exists in the
   * Docker stack. A fresh Room is created per attempt — livekit-client does not
   * guarantee a Room object is reusable after a failed connect.
   */
  private async connectRoom(j: JoinResponse): Promise<Room> {
    let lastError: unknown = new Error('No LiveKit URL available.');
    for (const url of this.livekitCandidates(j)) {
      const room = new Room({ adaptiveStream: true, dynacast: true });
      room
        .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => this.onRemoteTrack(track))
        .on(RoomEvent.TrackUnsubscribed, track => track.detach())
        .on(RoomEvent.ParticipantConnected, () => this.refreshRemotePresence())
        .on(RoomEvent.ParticipantDisconnected, () => this.refreshRemotePresence())
        .on(RoomEvent.Disconnected, () => { if (this.phase() === 'live') this.remoteConnected.set(false); });
      try {
        await room.connect(url, j.token);
        return room;
      } catch (e) {
        lastError = e;
        await room.disconnect().catch(() => {});
      }
    }
    throw lastError;
  }

  /**
   * Ordered list of signalling URLs to try:
   *  1. the backend-provided URL (rewritten to the page's host when the server
   *     handed back `localhost` but the app is being viewed from another device
   *     — LiveKit's 7880 port is published on the Docker host either way);
   *  2. the same-origin `/lk` reverse proxy.
   */
  private livekitCandidates(j: JoinResponse): string[] {
    const wsProto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const sameOriginProxy = `${wsProto}://${window.location.host}/lk`;
    const urls: string[] = [];

    const provided = j.livekitUrl?.trim();
    if (provided) {
      try {
        const u = new URL(provided);
        const pageHost = window.location.hostname;
        const providedIsLoopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
        const pageIsLoopback = pageHost === 'localhost' || pageHost === '127.0.0.1';
        if (providedIsLoopback && !pageIsLoopback) {
          urls.push(`${u.protocol}//${pageHost}:${u.port || '7880'}`);
        } else {
          urls.push(provided);
        }
      } catch { /* malformed URL from config — fall through to the proxy */ }
    }

    urls.push(sameOriginProxy);
    return [...new Set(urls)];
  }

  private onRemoteTrack(track: RemoteTrack): void {
    if (track.kind === Track.Kind.Video && this.remoteVideo) {
      track.attach(this.remoteVideo.nativeElement);
    } else if (track.kind === Track.Kind.Audio) {
      const el = track.attach();      // creates a hidden <audio>
      el.style.display = 'none';
      document.body.appendChild(el);
      this.audioEls.push(el);
    }
    this.refreshRemotePresence();
  }

  private attachLocalCamera(): void {
    const pub = this.room?.localParticipant.getTrackPublication(Track.Source.Camera);
    if (pub?.videoTrack && this.localVideo) pub.videoTrack.attach(this.localVideo.nativeElement);
  }

  private refreshRemotePresence(): void {
    this.remoteConnected.set((this.room?.remoteParticipants.size ?? 0) > 0);
  }

  // ── Controls ──────────────────────────────────────────────────────────────
  protected toggleMic(): void {
    const next = !this.micOn();
    this.room?.localParticipant.setMicrophoneEnabled(next);
    this.micOn.set(next);
  }

  protected toggleCam(): void {
    const next = !this.camOn();
    this.room?.localParticipant.setCameraEnabled(next).then(() => {
      if (next) this.attachLocalCamera();
    });
    this.camOn.set(next);
  }

  protected endCall(): void {
    const cid = this.join()?.consultationId;
    if (cid) this.api.end(cid).subscribe({ next: () => {}, error: () => {} });
    this.phase.set('ended');
    this.teardownRoom();
  }

  protected leave(): void {
    const role = this.join()?.role;
    this.router.navigateByUrl(role === 'DOCTOR' ? '/doctor/agenda' : '/patient/appointments');
  }

  protected readonly downloading = signal(false);

  /** Doctor downloads the consultation report (clinical note + summary) as a PDF. */
  protected downloadReport(): void {
    const cid = this.join()?.consultationId;
    if (!cid) return;
    this.downloading.set(true);
    this.api.reportPdf(cid).subscribe({
      next: blob => { saveBlob(blob, `report-${cid.slice(0, 8)}.pdf`); this.downloading.set(false); },
      error: () => this.downloading.set(false)
    });
  }

  /** Jump to the prescription composer, pre-selecting this appointment. */
  protected writePrescription(): void {
    this.router.navigate(['/doctor/prescriptions/new'], {
      queryParams: { appointmentId: this.appointmentId }
    });
  }

  // ── Chat ────────────────────────────────────────────────────────────────--
  private startChatPolling(): void {
    this.fetchMessages();
    this.pollTimer = setInterval(() => this.fetchMessages(), 3000);
  }

  private fetchMessages(): void {
    const cid = this.join()?.consultationId;
    if (!cid) return;
    this.api.messages(cid).subscribe(ms => {
      const grew = ms.length !== this.messages().length;
      this.messages.set(ms);
      if (grew) setTimeout(() => this.scrollChat(), 0);
    });
  }

  protected sendMessage(): void {
    const cid = this.join()?.consultationId;
    const body = this.draft.trim();
    if (!cid || !body) return;
    this.draft = '';
    this.api.send(cid, body).subscribe({
      next: () => this.fetchMessages(),
      error: () => { this.draft = body; }
    });
  }

  private scrollChat(): void {
    const el = this.chatList?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  // ── Clinical notes (doctor) ─────────────────────────────────────────────---
  private loadNote(): void {
    const cid = this.join()?.consultationId;
    if (!cid) return;
    this.api.getNote(cid).subscribe(n => { this.noteBody = n.body ?? ''; });
  }

  protected onNoteChange(): void {
    this.noteStatus.set('Saving…');
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.noteTimer = setTimeout(() => this.saveNote(), 800);
  }

  private saveNote(): void {
    const cid = this.join()?.consultationId;
    if (!cid) return;
    this.api.saveNote(cid, this.noteBody).subscribe({
      next: () => this.noteStatus.set('Saved'),
      error: () => this.noteStatus.set('Could not save')
    });
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  private fail(msg: string): void {
    this.errorMsg.set(msg);
    this.phase.set('error');
  }

  private teardownRoom(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.audioEls.forEach(el => el.remove());
    this.audioEls.length = 0;
    this.room?.disconnect();
    this.room = undefined;
  }

  ngOnDestroy(): void {
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.teardownRoom();
  }
}
