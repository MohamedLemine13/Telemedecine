import { Component, OnInit, inject, signal } from '@angular/core';

import { AppointmentApi, AvailabilityBlockInput } from '../../../core/api/appointment.api';
import { Button, Card, PageHeader } from '../../../shared/ui';

interface Row {
  dayOfWeek: number;
  startTime: string;   // "09:00"
  endTime: string;
  slotMinutes: number;
}

const DAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' }
];

@Component({
  selector: 'app-availability-editor',
  standalone: true,
  imports: [Button, Card, PageHeader],
  template: `
    <app-page-header title="Availability"
                     subtitle="Set the weekly hours patients can book. Each block is sliced into fixed-length slots.">
      <button actions app-button variant="ghost" (click)="addRow()" type="button">+ Add block</button>
    </app-page-header>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else {
      <app-card>
        <div header><h2 class="text-base font-semibold">Weekly schedule</h2></div>

        @if (rows().length === 0) {
          <p class="py-6 text-center text-sm text-[color:var(--color-neutral-500)]">
            No availability yet. Add a block to start accepting bookings.
          </p>
        } @else {
          <div class="grid gap-2">
            <div class="hidden grid-cols-[1.4fr_1fr_1fr_1fr_auto] gap-3 px-1 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)] md:grid">
              <span>Day</span><span>From</span><span>To</span><span>Slot length</span><span></span>
            </div>
            @for (r of rows(); track $index) {
              <div class="grid grid-cols-2 gap-3 rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] p-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto] md:items-center md:border-0 md:p-1">
                <select class="field" (change)="patch($index, 'dayOfWeek', +$any($event.target).value)">
                  @for (d of days; track d.value) { <option [value]="d.value" [selected]="d.value === r.dayOfWeek">{{ d.label }}</option> }
                </select>
                <input class="field" type="time" [value]="r.startTime" (change)="patch($index, 'startTime', $any($event.target).value)" />
                <input class="field" type="time" [value]="r.endTime" (change)="patch($index, 'endTime', $any($event.target).value)" />
                <select class="field" (change)="patch($index, 'slotMinutes', +$any($event.target).value)">
                  @for (m of slotChoices; track m) { <option [value]="m" [selected]="m === r.slotMinutes">{{ m }} min</option> }
                </select>
                <button type="button" (click)="removeRow($index)"
                  class="justify-self-end text-sm font-semibold text-[color:var(--color-error)] hover:underline">
                  Remove
                </button>
              </div>
            }
          </div>
        }

        <div class="mt-5 flex items-center gap-3">
          <button app-button type="button" (click)="save()" [loading]="saving()">
            {{ saving() ? 'Saving…' : 'Save schedule' }}
          </button>
          @if (error()) {
            <span class="text-xs text-[color:var(--color-error)]">{{ error() }}</span>
          } @else if (savedAt()) {
            <span class="text-xs text-[color:var(--color-success)]">Saved.</span>
          }
        </div>
      </app-card>

      <p class="mt-4 text-xs italic text-[color:var(--color-neutral-500)]">
        Times are in clinic-local time (Africa/Nouakchott). Patients see concrete bookable slots derived from these blocks.
      </p>
    }
  `,
  styles: `
    .field {
      height: 40px;
      padding: 0 10px;
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-input);
      font-size: 0.875rem;
      background: var(--color-neutral-0);
      width: 100%;
    }
  `
})
export class AvailabilityEditor implements OnInit {
  private readonly api = inject(AppointmentApi);

  protected readonly days = DAYS;
  protected readonly slotChoices = [15, 20, 30, 45, 60];

  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly savedAt = signal<number | null>(null);
  protected readonly rows = signal<Row[]>([]);

  ngOnInit(): void {
    this.api.getAvailability().subscribe({
      next: blocks => {
        this.rows.set(blocks.map(b => ({
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime.slice(0, 5),
          endTime: b.endTime.slice(0, 5),
          slotMinutes: b.slotMinutes
        })));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  protected addRow(): void {
    this.rows.update(rs => [...rs, { dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotMinutes: 30 }]);
    this.savedAt.set(null);
  }

  protected removeRow(i: number): void {
    this.rows.update(rs => rs.filter((_, idx) => idx !== i));
    this.savedAt.set(null);
  }

  protected patch(i: number, key: keyof Row, value: string | number): void {
    this.rows.update(rs => rs.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
    this.savedAt.set(null);
  }

  protected save(): void {
    // Client-side guard so the user gets an instant, friendly message.
    for (const r of this.rows()) {
      if (r.endTime <= r.startTime) {
        this.error.set('Each block must end after it starts.');
        return;
      }
    }
    this.saving.set(true);
    this.error.set(null);
    const blocks: AvailabilityBlockInput[] = this.rows();
    this.api.setAvailability(blocks).subscribe({
      next: saved => {
        this.rows.set(saved.map(b => ({
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime.slice(0, 5),
          endTime: b.endTime.slice(0, 5),
          slotMinutes: b.slotMinutes
        })));
        this.saving.set(false);
        this.savedAt.set(Date.now());
      },
      error: err => {
        this.saving.set(false);
        this.error.set(err?.error?.detail ?? err?.error?.title ?? 'Could not save schedule.');
      }
    });
  }
}
