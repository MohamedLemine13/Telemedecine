import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { SearchPage } from '../doctor/doctor.api';
import { environment } from '../../../environments/environment';

export interface DayCount {
  date: string;     // ISO date "2026-06-01"
  count: number;
}

export interface AdminMetricsDto {
  accountsTotal: number;
  patientsTotal: number;
  doctorsTotal: number;
  doctorsVerified: number;
  verificationsPending: number;
  appointmentsTotal: number;
  appointmentsScheduled: number;
  appointmentsCompleted: number;
  appointmentsCancelled: number;
  consultationsTotal: number;
  consultationsActive: number;
  prescriptionsTotal: number;
  invoicesPaid: number;
  invoicesPending: number;
  revenueCollected: number;
  currency: string;
  appointmentsByDay: DayCount[];
}

export type RoleCode = 'ROLE_PATIENT' | 'ROLE_DOCTOR' | 'ROLE_ADMIN';

export interface AccountSummaryDto {
  id: string;
  email: string;
  phone: string | null;
  roles: string[];
  status: string;       // ACTIVE | SUSPENDED
  tfaEnabled: boolean;
  createdAt: string;
}

/**
 * Admin platform overview + user management. Backed by /api/admin/metrics and
 * /api/admin/accounts. Verification review lives in {@link AdminApi}.
 */
@Injectable({ providedIn: 'root' })
export class AdminMetricsApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin`;

  metrics(): Observable<AdminMetricsDto> {
    return this.http.get<AdminMetricsDto>(`${this.base}/metrics`);
  }

  accounts(params: { q?: string; role?: RoleCode; page?: number; size?: number } = {}):
    Observable<SearchPage<AccountSummaryDto>> {
    const qp: Record<string, string> = {
      page: String(params.page ?? 0),
      size: String(params.size ?? 20)
    };
    if (params.q) qp['q'] = params.q;
    if (params.role) qp['role'] = params.role;
    return this.http.get<SearchPage<AccountSummaryDto>>(`${this.base}/accounts`, { params: qp });
  }

  suspend(id: string): Observable<AccountSummaryDto> {
    return this.http.post<AccountSummaryDto>(`${this.base}/accounts/${id}/suspend`, {});
  }

  activate(id: string): Observable<AccountSummaryDto> {
    return this.http.post<AccountSummaryDto>(`${this.base}/accounts/${id}/activate`, {});
  }

  notifyOne(id: string, title: string, body: string): Observable<void> {
    return this.http.post<void>(`${this.base}/accounts/${id}/notify`, { title, body });
  }

  /** Broadcast to a role (or everyone when role is omitted). Returns count sent. */
  broadcast(title: string, body: string, role?: RoleCode): Observable<{ sent: number }> {
    const qp: Record<string, string> = {};
    if (role) qp['role'] = role;
    return this.http.post<{ sent: number }>(`${this.base}/notifications/broadcast`, { title, body },
      { params: qp });
  }
}
