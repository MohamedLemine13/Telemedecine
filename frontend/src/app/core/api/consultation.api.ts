import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface JoinResponse {
  consultationId: string;
  appointmentId: string;
  roomName: string;
  livekitUrl: string;
  token: string;
  identity: string;
  role: 'PATIENT' | 'DOCTOR';
  selfName: string;
  counterpartName: string;
  mode: 'VIDEO' | 'PHONE';
}

export interface ChatMessageDto {
  id: string;
  senderAccountId: string;
  senderName: string;
  senderRole: 'PATIENT' | 'DOCTOR';
  body: string;
  sentAt: string;
}

export interface ClinicalNoteDto {
  body: string | null;
  updatedAt: string;
}

export interface ConversationDto {
  consultationId: string;
  appointmentId: string;
  counterpartName: string;
  mode: 'VIDEO' | 'PHONE';
  status: 'ACTIVE' | 'ENDED';
  startedAt: string;
  endedAt: string | null;
  lastMessage: string | null;
  lastMessageSender: string | null;
  lastMessageAt: string | null;
  messageCount: number;
}

@Injectable({ providedIn: 'root' })
export class ConsultationApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/consultations`;

  /** Every consultation the caller took part in — backs the Messages screen. */
  conversations(): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(this.base);
  }

  /** Doctor-only consultation report PDF, fetched as a Blob for the bearer token. */
  reportPdf(consultationId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${consultationId}/report.pdf`, { responseType: 'blob' });
  }

  join(appointmentId: string): Observable<JoinResponse> {
    return this.http.post<JoinResponse>(`${this.base}/${appointmentId}/join`, {});
  }

  end(consultationId: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${consultationId}/end`, {});
  }

  messages(consultationId: string): Observable<ChatMessageDto[]> {
    return this.http.get<ChatMessageDto[]>(`${this.base}/${consultationId}/messages`);
  }

  send(consultationId: string, body: string): Observable<ChatMessageDto> {
    return this.http.post<ChatMessageDto>(`${this.base}/${consultationId}/messages`, { body });
  }

  getNote(consultationId: string): Observable<ClinicalNoteDto> {
    return this.http.get<ClinicalNoteDto>(`${this.base}/${consultationId}/notes`);
  }

  saveNote(consultationId: string, body: string): Observable<ClinicalNoteDto> {
    return this.http.put<ClinicalNoteDto>(`${this.base}/${consultationId}/notes`, { body });
  }
}
