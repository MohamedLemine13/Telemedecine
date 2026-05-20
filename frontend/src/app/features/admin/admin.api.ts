import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { DoctorProfileDto, SearchPage } from '../doctor/doctor.api';
import { environment } from '../../../environments/environment';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface VerificationCaseDto {
  id: string;
  doctorId: string;
  doctor: DoctorProfileDto | null;
  status: VerificationStatus;
  reviewerId?: string | null;
  decisionNote?: string | null;
  decidedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/admin/verifications`;

  list(status?: VerificationStatus, page = 0, size = 20):
    Observable<SearchPage<VerificationCaseDto>> {
    const qp: Record<string, string> = { page: String(page), size: String(size) };
    if (status) qp['status'] = status;
    return this.http.get<SearchPage<VerificationCaseDto>>(this.base, { params: qp });
  }

  get(id: string): Observable<VerificationCaseDto> {
    return this.http.get<VerificationCaseDto>(`${this.base}/${id}`);
  }

  /**
   * Streams the credential file. We fetch as a Blob so the auth interceptor
   * stamps the bearer token; the page then opens it via an object URL.
   */
  downloadCredential(caseId: string, credentialId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${caseId}/credentials/${credentialId}/download`,
      { responseType: 'blob' });
  }

  approve(id: string, note?: string): Observable<VerificationCaseDto> {
    return this.http.post<VerificationCaseDto>(`${this.base}/${id}/approve`, { note: note || '' });
  }

  reject(id: string, note?: string): Observable<VerificationCaseDto> {
    return this.http.post<VerificationCaseDto>(`${this.base}/${id}/reject`, { note: note || '' });
  }
}
