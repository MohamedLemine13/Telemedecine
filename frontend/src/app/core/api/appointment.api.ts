import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export type AppointmentStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
export type AppointmentMode = 'VIDEO' | 'PHONE';
export type Party = 'PATIENT' | 'DOCTOR';

export interface AppointmentParty {
  id: string;
  name: string | null;
  email: string;
}

export interface AppointmentDto {
  id: string;
  status: AppointmentStatus;
  mode: AppointmentMode;
  startAt: string;   // ISO instant (UTC)
  endAt: string;
  reason?: string | null;
  cancelReason?: string | null;
  cancelledBy?: Party | null;
  doctor: AppointmentParty;
  patient: AppointmentParty;
}

export interface SlotDto {
  startAt: string;
  endAt: string;
}

export interface AvailabilityDto {
  id: string;
  dayOfWeek: number;     // 1 = Monday … 7 = Sunday
  startTime: string;     // "09:00:00"
  endTime: string;
  slotMinutes: number;
}

export interface AvailabilityBlockInput {
  dayOfWeek: number;
  startTime: string;     // "09:00"
  endTime: string;
  slotMinutes: number;
}

export interface BookAppointmentRequest {
  doctorId: string;
  startAt: string;
  mode?: AppointmentMode;
  reason?: string | null;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export interface DoctorPatientDto {
  patientId: string;
  name: string;
  email: string;
  appointmentCount: number;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
}

/**
 * Appointment booking + doctor availability. Shared by the patient and doctor
 * spaces — the backend scopes every call to the authenticated participant.
 */
@Injectable({ providedIn: 'root' })
export class AppointmentApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/appointments`;
  private readonly doctorsBase = `${environment.apiBaseUrl}/api/doctors`;

  // ── Appointments ──────────────────────────────────────────────────────────
  book(req: BookAppointmentRequest): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(this.base, req);
  }

  /** Doctor's distinct patients, aggregated from their appointments. */
  myPatients(): Observable<DoctorPatientDto[]> {
    return this.http.get<DoctorPatientDto[]>(`${this.base}/patients`);
  }

  list(params: { status?: AppointmentStatus; from?: string; to?: string; page?: number; size?: number } = {}):
    Observable<Page<AppointmentDto>> {
    let qp = new HttpParams();
    if (params.status) qp = qp.set('status', params.status);
    if (params.from)   qp = qp.set('from', params.from);
    if (params.to)     qp = qp.set('to', params.to);
    qp = qp.set('page', String(params.page ?? 0));
    qp = qp.set('size', String(params.size ?? 50));
    return this.http.get<Page<AppointmentDto>>(this.base, { params: qp });
  }

  get(id: string): Observable<AppointmentDto> {
    return this.http.get<AppointmentDto>(`${this.base}/${id}`);
  }

  reschedule(id: string, startAt: string): Observable<AppointmentDto> {
    return this.http.patch<AppointmentDto>(`${this.base}/${id}/reschedule`, { startAt });
  }

  cancel(id: string, reason?: string | null): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(`${this.base}/${id}/cancel`, { reason: reason ?? null });
  }

  complete(id: string): Observable<AppointmentDto> {
    return this.http.post<AppointmentDto>(`${this.base}/${id}/complete`, {});
  }

  // ── Doctor availability + slots ───────────────────────────────────────────
  slots(doctorId: string, from?: string, to?: string): Observable<SlotDto[]> {
    let qp = new HttpParams();
    if (from) qp = qp.set('from', from);
    if (to)   qp = qp.set('to', to);
    return this.http.get<SlotDto[]>(`${this.doctorsBase}/${doctorId}/slots`, { params: qp });
  }

  getAvailability(): Observable<AvailabilityDto[]> {
    return this.http.get<AvailabilityDto[]>(`${this.doctorsBase}/me/availability`);
  }

  setAvailability(blocks: AvailabilityBlockInput[]): Observable<AvailabilityDto[]> {
    return this.http.put<AvailabilityDto[]>(`${this.doctorsBase}/me/availability`, { blocks });
  }
}
