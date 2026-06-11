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
              <p class="text-sm opacity-70 max-w-sm">{{ videoError() }}</p>
              <p class="text-sm opacity-70">Chat still works — you can message on the right.</p>
              <button class="btn-primary mt-3" (click)="retryVideo()" [disabled]="retrying()">
                {{ retrying() ? 'Retrying…' : '↻ Retry camera' }}
              </button>
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
              <svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="micOn() ? MIC : MIC_OFF"></path></svg>
            </button>
            @if (join()?.mode === 'VIDEO') {
              <button class="ctrl" [class.off]="!camOn()" (click)="toggleCam()" title="Camera">
                <svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="camOn() ? CAM : CAM_OFF"></path></svg>
              </button>
            }
            <button class="ctrl end" (click)="endCall()" title="Leave">
              <svg class="mi" viewBox="0 0 24 24" aria-hidden="true"><path [attr.d]="CALL_END"></path></svg>
            </button>
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
    .ctrl { width: 48px; height: 48px; border-radius: 9999px; border: none; background: #1e293b; color: #fff; cursor: pointer; display: grid; place-items: center; }
    .ctrl .mi { width: 24px; height: 24px; fill: currentColor; display: block; }
    .ctrl.off { background: #475569; }
    .ctrl.end { background: var(--color-error); }

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

  // Material Design icon paths — identical to the Flutter app's Icons.mic /
  // mic_off / videocam / videocam_off / call_end, so the call controls look the
  // same on web and mobile.
  protected readonly MIC = 'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z';
  protected readonly MIC_OFF = 'M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zM15 11.16L9 5.18V5c0-1.66 1.34-3 3-3s3 1.34 3 3v6.16zM4.27 3L3 4.27l6 6V11c0 1.66 1.34 3 3 3 .23 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.54-.9L19.73 21 21 19.73 4.27 3z';
  protected readonly CAM = 'M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z';
  protected readonly CAM_OFF = 'M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z';
  protected readonly CALL_END = 'M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08c-.18-.17-.29-.42-.29-.7 0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28-.79-.74-1.69-1.36-2.67-1.85-.33-.16-.56-.5-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z';

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

    // 1) Ask the browser for camera/mic up front. This is what pops the native
    //    "Allow camera & microphone?" prompt; doing it explicitly (instead of
    //    letting LiveKit do it implicitly) lets us give a precise reason when it
    //    fails — denied, no device, or an insecure (http://) origin where the
    //    browser blocks media entirely.
    const needsCamera = j.mode === 'VIDEO';
    const granted = await this.ensureMediaPermissions(needsCamera);
    if (!granted) return;   // videoError already set with a helpful message

    // 2) Connect to the room and publish.
    try {
      const room = await this.connectRoom(j);
      this.room = room;

      if (needsCamera) {
        await room.localParticipant.enableCameraAndMicrophone();
        this.attachLocalCamera();
      } else {
        await room.localParticipant.setMicrophoneEnabled(true);
      }

      this.refreshRemotePresence();
      room.startAudio().catch(() => { /* autoplay may need a click; harmless */ });
    } catch (e: any) {
      this.videoError.set(this.describeMediaError(e));
    }
  }

  /**
   * Pre-flight the camera/microphone permission so the prompt is explicit and
   * failures are explainable. Returns false (and sets {@link videoError}) when
   * media can't be obtained, in which case the room stays in chat-only mode.
   */
  private async ensureMediaPermissions(withCamera: boolean): Promise<boolean> {
    // getUserMedia only exists on a secure context (https) or localhost. Over
    // plain http on a LAN IP the whole `mediaDevices` API is undefined — the
    // #1 cause of "the call always fails" when testing from a phone.
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.videoError.set(
        'Your browser blocks the camera and microphone on insecure (http://) ' +
        'connections. Open the app over https or via localhost to enable video calls.'
      );
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: withCamera
      });
      // We only needed the permission grant; LiveKit opens its own tracks next.
      stream.getTracks().forEach(t => t.stop());
      return true;
    } catch (e: any) {
      this.videoError.set(this.describeMediaError(e));
      return false;
    }
  }

  private describeMediaError(e: any): string {
    switch (e?.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'Camera/microphone access was blocked. Click the camera icon in ' +
               'your browser\'s address bar to allow it, then rejoin.';
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        return 'No camera or microphone was found on this device.';
      case 'NotReadableError':
        return 'Your camera or microphone is already in use by another app.';
      default:
        return e?.message || 'Camera/microphone or network unavailable.';
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

  protected readonly retrying = signal(false);

  /** Re-attempt camera/mic + room connection after the user fixes permissions. */
  protected async retryVideo(): Promise<void> {
    const j = this.join();
    if (!j || this.retrying()) return;
    this.retrying.set(true);
    this.videoError.set(null);
    this.teardownRoomOnly();
    try {
      const granted = await this.ensureMediaPermissions(j.mode === 'VIDEO');
      if (granted) {
        const room = await this.connectRoom(j);
        this.room = room;
        if (j.mode === 'VIDEO') {
          await room.localParticipant.enableCameraAndMicrophone();
          this.attachLocalCamera();
        } else {
          await room.localParticipant.setMicrophoneEnabled(true);
        }
        this.refreshRemotePresence();
        room.startAudio().catch(() => {});
      }
    } catch (e: any) {
      this.videoError.set(this.describeMediaError(e));
    } finally {
      this.retrying.set(false);
    }
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

  /** Drop the LiveKit room + audio elements but keep chat/notes running. */
  private teardownRoomOnly(): void {
    this.audioEls.forEach(el => el.remove());
    this.audioEls.length = 0;
    this.room?.disconnect();
    this.room = undefined;
    this.remoteConnected.set(false);
  }

  private teardownRoom(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.teardownRoomOnly();
  }

  ngOnDestroy(): void {
    if (this.noteTimer) clearTimeout(this.noteTimer);
    this.teardownRoom();
  }
}
