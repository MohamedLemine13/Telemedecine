import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page } from './appointment.api';

export interface NotificationDto {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  createdAt: string;
}

/**
 * In-app notification feed. The bell in the topbar polls {@link unreadCount};
 * the dropdown / page reads {@link list}. This stands in for browser push in
 * the school deployment — the same backend writes also mirror to email.
 */
@Injectable({ providedIn: 'root' })
export class NotificationApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/notifications`;

  list(page = 0, size = 30): Observable<Page<NotificationDto>> {
    return this.http.get<Page<NotificationDto>>(this.base,
      { params: { page: String(page), size: String(size) } });
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread-count`);
  }

  markRead(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/read`, {});
  }

  markAllRead(): Observable<void> {
    return this.http.post<void>(`${this.base}/read-all`, {});
  }
}
