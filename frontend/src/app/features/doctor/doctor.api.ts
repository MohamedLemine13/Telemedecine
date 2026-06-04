import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type CredentialKind = 'DIPLOMA' | 'BOARD_CERT' | 'LICENSE' | 'OTHER';
export type CredentialStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SpecialtyDto {
  id: string;
  code: string;
  labelFr: string;
  labelEn: string;
}

export interface CredentialDto {
  id: string;
  kind: CredentialKind;
  issuer?: string | null;
  issuedOn?: string | null;
  documentName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  status: CredentialStatus;
  createdAt: string;
}

export interface DoctorProfileDto {
  id: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  bio?: string | null;
  consultationFee?: number | null;
  currency: string;
  ratingAverage?: number | null;
  ratingCount: number;
  verified: boolean;
  specialties: SpecialtyDto[];
  languages: string[];
  credentials: CredentialDto[];
}

export interface UpdateDoctorProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
  title?: string | null;
  bio?: string | null;
  consultationFee?: number | null;
  currency?: string | null;
  specialties?: string[];
  languages?: string[];
}

export interface SearchPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

@Injectable({ providedIn: 'root' })
export class DoctorApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/doctors`;

  search(params: { specialty?: string; language?: string; page?: number; size?: number } = {}):
    Observable<SearchPage<DoctorProfileDto>> {
    const qp: Record<string, string> = {};
    if (params.specialty) qp['specialty'] = params.specialty;
    if (params.language)  qp['language']  = params.language;
    qp['page'] = String(params.page ?? 0);
    qp['size'] = String(params.size ?? 20);
    return this.http.get<SearchPage<DoctorProfileDto>>(this.base, { params: qp });
  }

  listSpecialties(): Observable<SpecialtyDto[]> {
    return this.http.get<SpecialtyDto[]>(`${this.base}/specialties`);
  }

  getById(id: string): Observable<DoctorProfileDto> {
    return this.http.get<DoctorProfileDto>(`${this.base}/${id}`);
  }

  getMine(): Observable<DoctorProfileDto> {
    return this.http.get<DoctorProfileDto>(`${this.base}/me`);
  }

  updateMine(req: UpdateDoctorProfileRequest): Observable<DoctorProfileDto> {
    return this.http.put<DoctorProfileDto>(`${this.base}/me`, req);
  }

  /**
   * Single multipart upload. The browser sets the proper Content-Type
   * boundary automatically when given a FormData body.
   */
  uploadCredential(file: File, kind: CredentialKind, issuer?: string | null):
    Observable<CredentialDto> {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    if (issuer) form.append('issuer', issuer);
    return this.http.post<CredentialDto>(`${this.base}/me/credentials`, form);
  }
}
