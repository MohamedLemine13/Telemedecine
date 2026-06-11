import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'REIMBURSEMENT_REQUESTED' | 'REIMBURSED';

export interface InvoiceDto {
  id: string;
  appointmentId: string;
  appointmentStartAt: string | null;
  doctorName: string;
  patientName: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  method: string | null;
  issuedAt: string;
  paidAt: string | null;
  reimbursedAmount: number | null;
  reimbursedAt: string | null;
}

export interface PaymentSummaryDto {
  totalBilled: number;
  totalPaid: number;
  totalReimbursed: number;
  pendingInvoices: number;
  currency: string;
}

/**
 * Simulated billing. Invoices are reconciled lazily on read from completed
 * appointments, so the patient "Payments" and doctor "Payouts" screens just
 * list and act on them. Pay / reimburse are mock state transitions.
 */
@Injectable({ providedIn: 'root' })
export class InvoiceApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/invoices`;

  list(): Observable<InvoiceDto[]> {
    return this.http.get<InvoiceDto[]>(this.base);
  }

  summary(): Observable<PaymentSummaryDto> {
    return this.http.get<PaymentSummaryDto>(`${this.base}/summary`);
  }

  pay(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${this.base}/${id}/pay`, {});
  }

  requestReimbursement(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${this.base}/${id}/request-reimbursement`, {});
  }

  // ── Admin reimbursement validation ──
  pendingReimbursements(): Observable<InvoiceDto[]> {
    return this.http.get<InvoiceDto[]>(`${environment.apiBaseUrl}/api/admin/reimbursements`);
  }

  approveReimbursement(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${environment.apiBaseUrl}/api/admin/reimbursements/${id}/approve`, {});
  }

  rejectReimbursement(id: string): Observable<InvoiceDto> {
    return this.http.post<InvoiceDto>(`${environment.apiBaseUrl}/api/admin/reimbursements/${id}/reject`, {});
  }
}
