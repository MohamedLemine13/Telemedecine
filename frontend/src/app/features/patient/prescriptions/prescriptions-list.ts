import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';

import { PrescriptionApi, PrescriptionDto } from '../../../core/api/prescription.api';
import { saveBlob } from '../../../core/util/download';
import { Button, Card, EmptyState, PageHeader } from '../../../shared/ui';

/**
 * Patient view of every prescription a doctor has issued to them. Each row can
 * be expanded to read the full body and downloaded as a branded PDF.
 */
@Component({
  selector: 'app-patient-prescriptions',
  standalone: true,
  imports: [DatePipe, Button, Card, EmptyState, PageHeader],
  template: `
    <app-page-header title="Prescriptions"
      subtitle="Medication and instructions issued by your doctors." />

    <app-card>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (items().length === 0) {
        <app-empty-state icon="℞" title="No prescriptions yet"
          description="After a consultation, any prescription your doctor writes will appear here." />
      } @else {
        <ul class="divide-y divide-[color:var(--color-neutral-200)]">
          @for (p of items(); track p.id) {
            <li class="py-4">
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="text-sm font-semibold">{{ p.title }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">
                    {{ p.doctorName }} · {{ p.issuedAt | date:'d MMMM yyyy, HH:mm' }}
                  </p>
                </div>
                <div class="flex shrink-0 gap-2">
                  <button app-button size="sm" variant="secondary" type="button" (click)="toggle(p.id)">
                    {{ expanded() === p.id ? 'Hide' : 'View' }}
                  </button>
                  <button app-button size="sm" type="button" (click)="download(p)"
                          [loading]="working() === p.id">PDF</button>
                </div>
              </div>
              @if (expanded() === p.id) {
                <pre class="prescription-body">{{ p.body }}</pre>
              }
            </li>
          }
        </ul>
      }
    </app-card>
  `,
  styles: `
    .prescription-body {
      margin-top: 12px; padding: 14px; white-space: pre-wrap; word-break: break-word;
      font-family: inherit; font-size: 0.82rem; line-height: 1.5;
      background: var(--color-neutral-50); border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-card); color: var(--color-neutral-800);
    }
  `
})
export class PatientPrescriptions implements OnInit {
  private readonly api = inject(PrescriptionApi);

  protected readonly loading = signal(true);
  protected readonly items = signal<PrescriptionDto[]>([]);
  protected readonly expanded = signal<string | null>(null);
  protected readonly working = signal<string | null>(null);

  ngOnInit(): void {
    this.api.list().subscribe({
      next: list => { this.items.set(list); this.loading.set(false); },
      error: () => { this.items.set([]); this.loading.set(false); }
    });
  }

  protected toggle(id: string): void {
    this.expanded.set(this.expanded() === id ? null : id);
  }

  protected download(p: PrescriptionDto): void {
    this.working.set(p.id);
    this.api.pdf(p.id).subscribe({
      next: blob => { saveBlob(blob, `prescription-${p.id.slice(0, 8)}.pdf`); this.working.set(null); },
      error: () => this.working.set(null)
    });
  }
}
