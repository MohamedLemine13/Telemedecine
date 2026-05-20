import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  AllergyDto,
  LabResultDto,
  PatientApi,
  PatientProfileDto,
  TreatmentDto
} from '../patient.api';
import { Button, Card } from '../../../shared/ui';

type Tab = 'overview' | 'allergies' | 'treatments' | 'labs';

@Component({
  selector: 'app-medical-record',
  standalone: true,
  imports: [ReactiveFormsModule, Button, Card],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-[color:var(--color-neutral-900)]">Medical record</h1>
      <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">
        Information here is private to you and the doctors you choose to consult.
      </p>
    </header>

    <!-- Tab bar -->
    <nav class="mb-4 flex gap-1 border-b border-[color:var(--color-neutral-200)]">
      @for (t of tabs; track t.id) {
        <button type="button" (click)="active.set(t.id)"
          [class]="active() === t.id ? 'tab-active' : 'tab'">
          {{ t.label }}
        </button>
      }
    </nav>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else if (error()) {
      <p class="text-sm text-[color:var(--color-error)]">{{ error() }}</p>
    } @else if (profile(); as p) {

      <!-- ─── Overview ─────────────────────────────────────────────────── -->
      @if (active() === 'overview') {
        <app-card>
          <div header><h2 class="text-base font-semibold">Identity</h2></div>
          <form [formGroup]="overviewForm" (ngSubmit)="saveOverview()" class="grid gap-3 md:grid-cols-2">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">First name</span>
              <input formControlName="firstName" class="field" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Last name</span>
              <input formControlName="lastName" class="field" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Date of birth</span>
              <input type="date" formControlName="dateOfBirth" class="field" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Gender</span>
              <select formControlName="gender" class="field">
                <option value="">—</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
                <option value="UNDISCLOSED">Prefer not to say</option>
              </select>
            </label>
            <label class="flex flex-col gap-1.5 md:col-span-2">
              <span class="text-xs font-semibold">Medical history</span>
              <textarea formControlName="medicalHistory" rows="5" class="field" placeholder="Past conditions, surgeries, family history…"></textarea>
            </label>
            <div class="md:col-span-2">
              <button app-button type="submit" [loading]="saving()">
                {{ saving() ? 'Saving…' : 'Save' }}
              </button>
              @if (savedAt()) {
                <span class="ml-3 text-xs text-[color:var(--color-success)]">Saved.</span>
              }
            </div>
          </form>
        </app-card>
      }

      <!-- ─── Allergies ────────────────────────────────────────────────── -->
      @if (active() === 'allergies') {
        <app-card>
          <div header><h2 class="text-base font-semibold">Add an allergy</h2></div>
          <form [formGroup]="allergyForm" (ngSubmit)="addAllergy()" class="grid gap-3 md:grid-cols-4">
            <label class="flex flex-col gap-1.5 md:col-span-2">
              <span class="text-xs font-semibold">Substance</span>
              <input formControlName="substance" class="field" placeholder="e.g. Penicillin" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Severity</span>
              <select formControlName="severity" class="field">
                <option value="">—</option>
                <option value="MILD">Mild</option>
                <option value="MODERATE">Moderate</option>
                <option value="SEVERE">Severe</option>
                <option value="LIFE_THREATENING">Life-threatening</option>
              </select>
            </label>
            <div class="flex items-end">
              <button app-button type="submit" [disabled]="allergyForm.invalid">Add</button>
            </div>
            <label class="flex flex-col gap-1.5 md:col-span-4">
              <span class="text-xs font-semibold">Notes</span>
              <input formControlName="notes" class="field" />
            </label>
          </form>
        </app-card>

        <div class="mt-4 grid gap-3">
          @for (a of p.allergies; track a.id) {
            <app-card [padded]="true">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold">{{ a.substance }}</p>
                  @if (a.severity) { <p class="text-xs text-[color:var(--color-neutral-500)]">{{ a.severity }}</p> }
                  @if (a.notes) { <p class="mt-1 text-sm">{{ a.notes }}</p> }
                </div>
                <button type="button" (click)="deleteAllergy(a.id!)"
                  class="text-xs text-[color:var(--color-error)] hover:underline">Remove</button>
              </div>
            </app-card>
          } @empty {
            <p class="text-sm text-[color:var(--color-neutral-500)]">No allergies recorded yet.</p>
          }
        </div>
      }

      <!-- ─── Treatments ──────────────────────────────────────────────── -->
      @if (active() === 'treatments') {
        <app-card>
          <div header><h2 class="text-base font-semibold">Add a treatment</h2></div>
          <form [formGroup]="treatmentForm" (ngSubmit)="addTreatment()" class="grid gap-3 md:grid-cols-4">
            <label class="flex flex-col gap-1.5 md:col-span-2">
              <span class="text-xs font-semibold">Medication</span>
              <input formControlName="medication" class="field" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Dosage</span>
              <input formControlName="dosage" class="field" placeholder="500 mg" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Frequency</span>
              <input formControlName="frequency" class="field" placeholder="3×/day" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Started on</span>
              <input type="date" formControlName="startedOn" class="field" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Ended on</span>
              <input type="date" formControlName="endedOn" class="field" />
            </label>
            <div class="flex items-end md:col-span-2">
              <button app-button type="submit" [disabled]="treatmentForm.invalid">Add</button>
            </div>
          </form>
        </app-card>

        <div class="mt-4 grid gap-3">
          @for (t of p.treatments; track t.id) {
            <app-card>
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold">{{ t.medication }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ t.dosage }} · {{ t.frequency }}</p>
                  @if (t.startedOn || t.endedOn) {
                    <p class="text-xs text-[color:var(--color-neutral-500)]">
                      {{ t.startedOn || '?' }} → {{ t.endedOn || 'ongoing' }}
                    </p>
                  }
                </div>
                <button type="button" (click)="deleteTreatment(t.id!)"
                  class="text-xs text-[color:var(--color-error)] hover:underline">Remove</button>
              </div>
            </app-card>
          } @empty {
            <p class="text-sm text-[color:var(--color-neutral-500)]">No treatments recorded yet.</p>
          }
        </div>
      }

      <!-- ─── Lab results ─────────────────────────────────────────────── -->
      @if (active() === 'labs') {
        <app-card>
          <div header><h2 class="text-base font-semibold">Add a lab result</h2></div>
          <form [formGroup]="labForm" (ngSubmit)="addLab()" class="grid gap-3 md:grid-cols-4">
            <label class="flex flex-col gap-1.5 md:col-span-2">
              <span class="text-xs font-semibold">Test</span>
              <input formControlName="label" class="field" placeholder="HbA1c, Hemoglobin…" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Value</span>
              <input formControlName="resultValue" class="field" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Unit</span>
              <input formControlName="unit" class="field" placeholder="mg/dL" />
            </label>
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Performed on</span>
              <input type="date" formControlName="performedOn" class="field" />
            </label>
            <div class="flex items-end md:col-span-3">
              <button app-button type="submit" [disabled]="labForm.invalid">Add</button>
            </div>
          </form>
        </app-card>

        <div class="mt-4 grid gap-3">
          @for (r of p.labResults; track r.id) {
            <app-card>
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-sm font-semibold">{{ r.label }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ r.performedOn }}</p>
                  @if (r.resultValue) {
                    <p class="mt-1 text-lg font-bold">{{ r.resultValue }} <span class="text-xs font-normal text-[color:var(--color-neutral-500)]">{{ r.unit }}</span></p>
                  }
                </div>
                <button type="button" (click)="deleteLab(r.id!)"
                  class="text-xs text-[color:var(--color-error)] hover:underline">Remove</button>
              </div>
            </app-card>
          } @empty {
            <p class="text-sm text-[color:var(--color-neutral-500)]">No lab results yet.</p>
          }
        </div>
      }
    }
  `,
  styles: `
    .tab, .tab-active {
      padding: 10px 16px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
      border: none;
      color: var(--color-neutral-500);
      border-bottom: 2px solid transparent;
    }
    .tab-active {
      color: var(--color-primary-700);
      border-bottom-color: var(--color-primary-700);
    }
    .field {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-input);
      font-size: 0.875rem;
      background: var(--color-neutral-0);
    }
    .field:focus { outline: none; border-color: var(--color-primary-700); }
    textarea.field { height: auto; padding: 10px 12px; resize: vertical; }
  `
})
export class MedicalRecord {
  private readonly api = inject(PatientApi);
  private readonly fb = inject(FormBuilder);

  protected readonly active = signal<Tab>('overview');
  protected readonly tabs: { id: Tab; label: string }[] = [
    { id: 'overview',   label: 'Overview' },
    { id: 'allergies',  label: 'Allergies' },
    { id: 'treatments', label: 'Treatments' },
    { id: 'labs',       label: 'Lab results' }
  ];

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly profile = signal<PatientProfileDto | null>(null);
  protected readonly saving = signal(false);
  protected readonly savedAt = signal<number | null>(null);

  protected readonly overviewForm = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    dateOfBirth: [''],
    gender: [''],
    medicalHistory: ['']
  });

  protected readonly allergyForm = this.fb.nonNullable.group({
    substance: ['', [Validators.required]],
    severity: [''],
    notes: ['']
  });

  protected readonly treatmentForm = this.fb.nonNullable.group({
    medication: ['', [Validators.required]],
    dosage: [''],
    frequency: [''],
    startedOn: [''],
    endedOn: ['']
  });

  protected readonly labForm = this.fb.nonNullable.group({
    label: ['', [Validators.required]],
    resultValue: [''],
    unit: [''],
    performedOn: ['']
  });

  ngOnInit(): void {
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.getMine().subscribe({
      next: p => {
        this.profile.set(p);
        this.overviewForm.patchValue({
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          dateOfBirth: p.dateOfBirth ?? '',
          gender: (p.gender as string) ?? '',
          medicalHistory: p.medicalHistory ?? ''
        });
        this.loading.set(false);
      },
      error: e => {
        this.loading.set(false);
        this.error.set(e?.error?.title ?? 'Could not load medical record.');
      }
    });
  }

  protected saveOverview(): void {
    this.saving.set(true);
    this.api.updateMine({
      ...this.overviewForm.getRawValue(),
      gender: (this.overviewForm.controls.gender.value || null) as any
    }).subscribe({
      next: p => {
        this.profile.set(p);
        this.saving.set(false);
        this.savedAt.set(Date.now());
      },
      error: () => this.saving.set(false)
    });
  }

  protected addAllergy(): void {
    if (this.allergyForm.invalid) return;
    const v = this.allergyForm.getRawValue();
    this.api.addAllergy({
      substance: v.substance,
      severity: (v.severity || null) as any,
      notes: v.notes || null
    }).subscribe(() => {
      this.allergyForm.reset({ substance: '', severity: '', notes: '' });
      this.refresh();
    });
  }
  protected deleteAllergy(id: string): void {
    this.api.deleteAllergy(id).subscribe(() => this.refresh());
  }

  protected addTreatment(): void {
    if (this.treatmentForm.invalid) return;
    const v = this.treatmentForm.getRawValue();
    this.api.addTreatment({
      medication: v.medication,
      dosage: v.dosage || null,
      frequency: v.frequency || null,
      startedOn: v.startedOn || null,
      endedOn: v.endedOn || null
    }).subscribe(() => {
      this.treatmentForm.reset({ medication: '', dosage: '', frequency: '', startedOn: '', endedOn: '' });
      this.refresh();
    });
  }
  protected deleteTreatment(id: string): void {
    this.api.deleteTreatment(id).subscribe(() => this.refresh());
  }

  protected addLab(): void {
    if (this.labForm.invalid) return;
    const v = this.labForm.getRawValue();
    this.api.addLabResult({
      label: v.label,
      resultValue: v.resultValue || null,
      unit: v.unit || null,
      performedOn: v.performedOn || null
    }).subscribe(() => {
      this.labForm.reset({ label: '', resultValue: '', unit: '', performedOn: '' });
      this.refresh();
    });
  }
  protected deleteLab(id: string): void {
    this.api.deleteLabResult(id).subscribe(() => this.refresh());
  }
}
