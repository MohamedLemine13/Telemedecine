import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AppointmentApi, AppointmentMode, SlotDto } from '../../../core/api/appointment.api';
import { DoctorApi, DoctorProfileDto } from '../../doctor/doctor.api';
import { Button, Card, StatusBadge } from '../../../shared/ui';

interface DayGroup {
  date: string;          // ISO date "2026-06-08" (clinic-local)
  label: string;
  slots: SlotDto[];
}

@Component({
  selector: 'app-doctor-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, Button, Card, StatusBadge],
  template: `
    <a routerLink="/patient/doctors"
       class="mb-4 inline-block text-sm font-semibold text-[color:var(--color-primary-700)] hover:underline">
      ← Back to search
    </a>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else if (doctor(); as d) {
      <section class="grid gap-4 lg:grid-cols-3">
        <!-- Doctor card -->
        <app-card class="lg:col-span-1">
          <div class="flex items-start justify-between">
            <div>
              <h1 class="text-xl font-bold">{{ d.title || 'Dr.' }} {{ d.firstName }} {{ d.lastName }}</h1>
              <p class="mt-1 text-xs text-[color:var(--color-neutral-500)]">
                {{ specialtyLabels(d) || 'General practice' }}
              </p>
            </div>
            <app-status-badge variant="success" label="Verified" />
          </div>

          @if (d.bio) { <p class="mt-3 text-sm">{{ d.bio }}</p> }

          <dl class="mt-4 grid gap-2 text-sm">
            <div class="flex justify-between">
              <dt class="text-[color:var(--color-neutral-500)]">Consultation fee</dt>
              <dd class="font-semibold">{{ d.consultationFee ? (d.consultationFee + ' ' + d.currency) : '—' }}</dd>
            </div>
            <div class="flex justify-between">
              <dt class="text-[color:var(--color-neutral-500)]">Languages</dt>
              <dd>{{ d.languages.length ? d.languages.join(' · ') : '—' }}</dd>
            </div>
          </dl>
        </app-card>

        <!-- Booking -->
        <app-card class="lg:col-span-2">
          <div header><h2 class="text-base font-semibold">Book an appointment</h2></div>

          @if (days().length === 0) {
            <p class="py-8 text-center text-sm text-[color:var(--color-neutral-500)]">
              This doctor has no open slots in the next two weeks. Please check back later.
            </p>
          } @else {
            <p class="mb-3 text-xs text-[color:var(--color-neutral-500)]">
              Pick a time (clinic-local). Showing the next 14 days.
            </p>
            <div class="grid gap-4">
              @for (g of days(); track g.date) {
                <div>
                  <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">{{ g.label }}</p>
                  <div class="flex flex-wrap gap-2">
                    @for (s of g.slots; track s.startAt) {
                      <button type="button" (click)="selectSlot(s)"
                        class="slot" [class.slot-active]="selected()?.startAt === s.startAt">
                        {{ s.startAt | date:'HH:mm':'UTC' }}
                      </button>
                    }
                  </div>
                </div>
              }
            </div>

            @if (selected(); as sel) {
              <form [formGroup]="form" (ngSubmit)="confirm()"
                    class="mt-5 rounded-[var(--radius-card)] border border-[color:var(--color-primary-700)] bg-[color:var(--color-primary-50)] p-4">
                <p class="text-sm font-semibold">
                  {{ sel.startAt | date:'EEEE d MMMM, HH:mm':'UTC' }}
                </p>
                <div class="mt-3 grid gap-3 md:grid-cols-2">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-xs font-semibold">Mode</span>
                    <select formControlName="mode" class="field">
                      <option value="VIDEO">Video consultation</option>
                      <option value="PHONE">Phone call</option>
                    </select>
                  </label>
                  <label class="flex flex-col gap-1.5 md:col-span-2">
                    <span class="text-xs font-semibold">Reason (optional)</span>
                    <input formControlName="reason" class="field" maxlength="500"
                      placeholder="e.g. Follow-up, persistent cough…" />
                  </label>
                </div>
                <div class="mt-3 flex items-center gap-3">
                  <button app-button type="submit" [loading]="booking()">
                    {{ booking() ? 'Booking…' : 'Confirm booking' }}
                  </button>
                  <button app-button type="button" variant="ghost" (click)="selected.set(null)">Cancel</button>
                  @if (bookError()) {
                    <span class="text-xs text-[color:var(--color-error)]">{{ bookError() }}</span>
                  }
                </div>
              </form>
            }
          }
        </app-card>
      </section>
    } @else {
      <p class="text-sm text-[color:var(--color-error)]">Doctor not found.</p>
    }
  `,
  styles: `
    .field {
      height: 40px; padding: 0 12px;
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-input);
      font-size: 0.875rem; background: var(--color-neutral-0);
    }
    .slot {
      padding: 6px 14px; border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-input); font-size: 0.85rem; font-weight: 600;
      background: var(--color-neutral-0); cursor: pointer;
      transition: background-color .15s, border-color .15s;
    }
    .slot:hover { border-color: var(--color-primary-700); }
    .slot-active {
      background: var(--color-primary-700); color: #fff; border-color: var(--color-primary-700);
    }
  `
})
export class DoctorDetail implements OnInit {
  private readonly doctorApi = inject(DoctorApi);
  private readonly api = inject(AppointmentApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly doctor = signal<DoctorProfileDto | null>(null);
  protected readonly slots = signal<SlotDto[]>([]);
  protected readonly selected = signal<SlotDto | null>(null);
  protected readonly booking = signal(false);
  protected readonly bookError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    mode: ['VIDEO' as AppointmentMode],
    reason: ['']
  });

  protected readonly days = computed<DayGroup[]>(() => {
    const groups = new Map<string, SlotDto[]>();
    for (const s of this.slots()) {
      const date = s.startAt.slice(0, 10);   // clinic zone is UTC+0
      (groups.get(date) ?? groups.set(date, []).get(date)!).push(s);
    }
    return [...groups.entries()].map(([date, slots]) => ({
      date,
      label: new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, {
        weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC'
      }),
      slots
    }));
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.doctorApi.getById(id).subscribe({
      next: d => { this.doctor.set(d); this.loading.set(false); this.loadSlots(id); },
      error: () => { this.doctor.set(null); this.loading.set(false); }
    });
  }

  private loadSlots(doctorId: string): void {
    this.api.slots(doctorId).subscribe({
      next: s => this.slots.set(s),
      error: () => this.slots.set([])
    });
  }

  protected selectSlot(s: SlotDto): void {
    this.selected.set(s);
    this.bookError.set(null);
  }

  protected specialtyLabels(d: DoctorProfileDto): string {
    return d.specialties.map(s => s.labelEn).join(', ');
  }

  protected confirm(): void {
    const sel = this.selected();
    const d = this.doctor();
    if (!sel || !d) return;
    this.booking.set(true);
    this.bookError.set(null);
    const v = this.form.getRawValue();
    this.api.book({ doctorId: d.id, startAt: sel.startAt, mode: v.mode, reason: v.reason || null }).subscribe({
      next: () => this.router.navigateByUrl('/patient/appointments'),
      error: err => {
        this.booking.set(false);
        this.bookError.set(err?.error?.detail ?? err?.error?.title ?? 'Could not book. The slot may have been taken.');
        // Refresh slots so a just-taken time disappears.
        this.loadSlots(d.id);
        this.selected.set(null);
      }
    });
  }
}
