import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface PrescriptionDto {
  id: string;
  appointmentId: string;
  doctorName: string;
  patientName: string;
  title: string;
  body: string;
  issuedAt: string;
}

export interface IssuePrescriptionRequest {
  appointmentId: string;
  title: string;
  body: string;
}

/**
 * Prescriptions are issued by doctors and read by both parties. The list
 * endpoint is role-aware on the backend — a patient sees prescriptions written
 * for them, a doctor sees the ones they authored.
 */
@Injectable({ providedIn: 'root' })
export class PrescriptionApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/prescriptions`;

  list(): Observable<PrescriptionDto[]> {
    return this.http.get<PrescriptionDto[]>(this.base);
  }

  get(id: string): Observable<PrescriptionDto> {
    return this.http.get<PrescriptionDto>(`${this.base}/${id}`);
  }

  issue(req: IssuePrescriptionRequest): Observable<PrescriptionDto> {
    return this.http.post<PrescriptionDto>(this.base, req);
  }

  /** Fetched as a Blob so the auth interceptor can stamp the bearer token. */
  pdf(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/pdf`, { responseType: 'blob' });
  }
}
