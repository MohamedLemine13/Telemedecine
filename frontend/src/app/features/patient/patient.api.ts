import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'UNDISCLOSED';
export type AllergySeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export interface AllergyDto {
  id?: string;
  substance: string;
  severity?: AllergySeverity | null;
  notes?: string | null;
}

export interface TreatmentDto {
  id?: string;
  medication: string;
  dosage?: string | null;
  frequency?: string | null;
  startedOn?: string | null;
  endedOn?: string | null;
  notes?: string | null;
}

export interface LabResultDto {
  id?: string;
  label: string;
  performedOn?: string | null;
  resultValue?: string | null;
  unit?: string | null;
  notes?: string | null;
  documentUrl?: string | null;
}

export interface PatientProfileDto {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  medicalHistory?: string | null;
  allergies: AllergyDto[];
  treatments: TreatmentDto[];
  labResults: LabResultDto[];
}

export interface UpdatePatientProfileRequest {
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  gender?: Gender | null;
  medicalHistory?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PatientApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/patients/me`;

  getMine(): Observable<PatientProfileDto> {
    return this.http.get<PatientProfileDto>(this.base);
  }
  updateMine(req: UpdatePatientProfileRequest): Observable<PatientProfileDto> {
    return this.http.put<PatientProfileDto>(this.base, req);
  }

  addAllergy(dto: AllergyDto): Observable<AllergyDto> {
    return this.http.post<AllergyDto>(`${this.base}/allergies`, dto);
  }
  deleteAllergy(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/allergies/${id}`);
  }

  addTreatment(dto: TreatmentDto): Observable<TreatmentDto> {
    return this.http.post<TreatmentDto>(`${this.base}/treatments`, dto);
  }
  deleteTreatment(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/treatments/${id}`);
  }

  addLabResult(dto: LabResultDto): Observable<LabResultDto> {
    return this.http.post<LabResultDto>(`${this.base}/lab-results`, dto);
  }
  deleteLabResult(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/lab-results/${id}`);
  }
}
