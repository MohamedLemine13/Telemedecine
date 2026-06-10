import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AppointmentApi, AppointmentDto } from '../../../core/api/appointment.api';
import { PrescriptionApi, PrescriptionDto } from '../../../core/api/prescription.api';
import { saveBlob } from '../../../core/util/download';
import { Button, Card, PageHeader } from '../../../shared/ui';

/**
 * Doctor-facing prescription composer. The doctor picks one of their
 * appointments (which fixes the patient), writes a title + body, and issues it.
 * The freshly created prescription can be downloaded as a PDF straight away.
 * A `?appointmentId=` query param pre-selects the appointment (used from the
 * consultation room "Write prescription" action).
 */
@Component({
  selector: 'app-issue-prescription',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink, Button, Card, PageHeader],
  template: `
    <app-page-header title="New prescription"
      subtitle="Issue a prescription tied to one of your appointments." />

    <app-card>
      @if (done(); as p) {
        <div class="rounded-[var(--radius-card)] border border-[color:var(--color-success,#16a34a)] bg-[color:var(--color-success-50,#ecfdf5)] p-4">
          <p class="text-sm font-semibold text-[color:var(--color-success,#16a34a)]">Prescription issued ✓</p>
          <p class="mt-1 text-sm">“{{ p.title }}” for {{ p.patientName }}.</p>
          <div class="mt-3 flex gap-2">
            <button app-button size="sm" type="button" (click)="downloadLast()">Download PDF</button>
            <button app-button size="sm" variant="secondary" type="button" (click)="reset()">Write another</button>
            <a app-button size="sm" variant="tertiary" routerLink="/doctor/agenda">Back to agenda</a>
          </div>
        </div>
      } @else {
        <form class="space-y-4" (ngSubmit)="submit()">
          <div>
            <label class="mb-1 block text-xs font-semibold">Appointment</label>
            <select [(ngModel)]="appointmentId" name="appointmentId" required class="field">
              <option value="" disabled>Select an appointment…</option>
              @for (a of appointments(); track a.id) {
                <option [value]="a.id">
                  {{ a.patient.name || a.patient.email }} — {{ a.startAt | date:'d MMM yyyy, HH:mm' }} ({{ a.status }})
                </option>
              }
            </select>
            @if (appointments().length === 0 && !loading()) {
              <p class="mt-1 text-xs text-[color:var(--color-neutral-500)]">
                No appointments to prescribe against yet.
              </p>
            }
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold">Title</label>
            <input type="text" [(ngModel)]="title" name="title" maxlength="200" required
              placeholder="e.g. Amoxicillin 500mg — 7 days" class="field" />
          </div>

          <div>
            <label class="mb-1 block text-xs font-semibold">Details</label>
            <textarea [(ngModel)]="body" name="body" rows="8" maxlength="8000" required
              placeholder="Medication, dosage, frequency, duration and any instructions…"
              class="field"></textarea>
          </div>

          @if (error()) { <p class="text-sm text-[color:var(--color-error)]">{{ error() }}</p> }

          <button app-button type="submit" [loading]="saving()"
            [disabled]="!appointmentId || !title.trim() || !body.trim()">Issue prescription</button>
        </form>
      }
    </app-card>
  `,
  styles: `
    .field {
      width: 100%; padding: 9px 12px; font-size: 0.85rem;
      border: 1px solid var(--color-neutral-200); border-radius: var(--radius-input);
      background: var(--color-neutral-0); outline: 0;
    }
    .field:focus { border-color: var(--color-primary-700); }
    textarea.field { resize: vertical; font-family: inherit; line-height: 1.5; }
  `
})
export class IssuePrescription implements OnInit {
  private readonly appointmentApi = inject(AppointmentApi);
  private readonly api = inject(PrescriptionApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly appointments = signal<AppointmentDto[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<PrescriptionDto | null>(null);

  protected appointmentId = '';
  protected title = '';
  protected body = '';

  ngOnInit(): void {
    const preset = this.route.snapshot.queryParamMap.get('appointmentId');
    if (preset) this.appointmentId = preset;
    this.appointmentApi.list({ size: 100 }).subscribe({
      next: page => { this.appointments.set(page.content); this.loading.set(false); },
      error: () => { this.appointments.set([]); this.loading.set(false); }
    });
  }

  protected submit(): void {
    if (!this.appointmentId || !this.title.trim() || !this.body.trim()) return;
    this.saving.set(true); this.error.set(null);
    this.api.issue({ appointmentId: this.appointmentId, title: this.title.trim(), body: this.body.trim() })
      .subscribe({
        next: p => { this.done.set(p); this.saving.set(false); },
        error: err => {
          this.saving.set(false);
          this.error.set(err?.error?.detail ?? 'Could not issue the prescription. Check the appointment and try again.');
        }
      });
  }

  protected downloadLast(): void {
    const p = this.done();
    if (!p) return;
    this.api.pdf(p.id).subscribe({
      next: blob => saveBlob(blob, `prescription-${p.id.slice(0, 8)}.pdf`),
      error: () => {}
    });
  }

  protected reset(): void {
    this.done.set(null);
    this.title = '';
    this.body = '';
  }
}
