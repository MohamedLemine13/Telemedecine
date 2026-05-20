import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CredentialDto,
  CredentialKind,
  DoctorApi,
  DoctorProfileDto,
  SpecialtyDto
} from '../doctor.api';
import { Button, Card, StatusBadge, StatusVariant } from '../../../shared/ui';

const LANGUAGES = [
  { tag: 'fr', label: 'Français' },
  { tag: 'en', label: 'English' },
  { tag: 'ar', label: 'العربية' },
  { tag: 'es', label: 'Español' },
  { tag: 'pt', label: 'Português' }
];

@Component({
  selector: 'app-doctor-profile-page',
  standalone: true,
  imports: [ReactiveFormsModule, Button, Card, StatusBadge],
  template: `
    <header class="mb-6 flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-bold text-[color:var(--color-neutral-900)]">Public profile</h1>
        <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">
          Patients see this once your credentials are verified by an administrator.
        </p>
      </div>
      @if (profile(); as p) {
        @if (p.verified) {
          <app-status-badge variant="success" label="Verified · visible in search" />
        } @else {
          <app-status-badge variant="pending" label="Pending verification" />
        }
      }
    </header>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else if (profile(); as p) {

      <!-- Identity + bio -->
      <app-card>
        <div header><h2 class="text-base font-semibold">Identity</h2></div>
        <form [formGroup]="form" (ngSubmit)="save()" class="grid gap-3 md:grid-cols-2">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">Title</span>
            <select formControlName="title" class="field">
              <option value="">—</option>
              <option value="Dr.">Dr.</option>
              <option value="Pr.">Pr.</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">Consultation fee (MRU)</span>
            <input type="number" formControlName="consultationFee" class="field" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">First name</span>
            <input formControlName="firstName" class="field" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">Last name</span>
            <input formControlName="lastName" class="field" />
          </label>
          <label class="flex flex-col gap-1.5 md:col-span-2">
            <span class="text-xs font-semibold">Bio</span>
            <textarea rows="4" formControlName="bio" class="field" placeholder="Brief description visible to patients"></textarea>
          </label>

          <fieldset class="md:col-span-2">
            <legend class="text-xs font-semibold">Specialties</legend>
            <div class="mt-2 flex flex-wrap gap-2">
              @for (s of specialties(); track s.id) {
                <label class="chip" [class.active]="selectedSpecialties().has(s.code)">
                  <input type="checkbox" class="sr-only"
                    [checked]="selectedSpecialties().has(s.code)"
                    (change)="toggleSpecialty(s.code, $event)" />
                  {{ s.labelEn }}
                </label>
              }
            </div>
          </fieldset>

          <fieldset class="md:col-span-2">
            <legend class="text-xs font-semibold">Languages spoken</legend>
            <div class="mt-2 flex flex-wrap gap-2">
              @for (l of languages; track l.tag) {
                <label class="chip" [class.active]="selectedLanguages().has(l.tag)">
                  <input type="checkbox" class="sr-only"
                    [checked]="selectedLanguages().has(l.tag)"
                    (change)="toggleLanguage(l.tag, $event)" />
                  {{ l.label }}
                </label>
              }
            </div>
          </fieldset>

          <div class="md:col-span-2">
            <button app-button type="submit" [loading]="saving()">
              {{ saving() ? 'Saving…' : 'Save profile' }}
            </button>
            @if (saveError()) {
              <span class="ml-3 text-xs text-[color:var(--color-error)]">{{ saveError() }}</span>
            } @else if (savedAt()) {
              <span class="ml-3 text-xs text-[color:var(--color-success)]">Saved.</span>
            }
          </div>
        </form>
      </app-card>

      <!-- Credentials -->
      <app-card class="mt-4">
        <div header><h2 class="text-base font-semibold">Credentials</h2></div>

        <div class="grid gap-3">
          @for (c of p.credentials; track c.id) {
            <div class="flex items-center justify-between rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] p-3">
              <div>
                <p class="text-sm font-semibold">{{ c.kind }} — {{ c.documentName }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">
                  {{ c.issuer || 'Issuer unknown' }} · {{ c.contentType }} · {{ formatBytes(c.sizeBytes) }}
                </p>
              </div>
              <app-status-badge [variant]="statusVariant(c.status)" [label]="c.status" />
            </div>
          } @empty {
            <p class="text-sm text-[color:var(--color-neutral-500)]">
              You haven't uploaded any credentials yet. Upload a diploma or board certification
              below to start the verification process.
            </p>
          }
        </div>

        <form [formGroup]="uploadForm" (ngSubmit)="upload()" class="mt-5 grid gap-3 md:grid-cols-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">Kind</span>
            <select formControlName="kind" class="field">
              <option value="DIPLOMA">Diploma</option>
              <option value="BOARD_CERT">Board certification</option>
              <option value="LICENSE">License</option>
              <option value="OTHER">Other</option>
            </select>
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">Issuer</span>
            <input formControlName="issuer" class="field" placeholder="e.g. Université de Nouakchott" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-xs font-semibold">File (PDF, JPG, PNG)</span>
            <input type="file" (change)="onFile($event)"
              accept="application/pdf,image/jpeg,image/png" class="field py-2" />
          </label>
          <div class="md:col-span-3">
            <button app-button type="submit" [disabled]="!file() || uploading()" [loading]="uploading()">
              {{ uploading() ? 'Uploading…' : 'Upload credential' }}
            </button>
            @if (uploadError()) {
              <span class="ml-3 text-xs text-[color:var(--color-error)]">{{ uploadError() }}</span>
            } @else if (uploadDone()) {
              <span class="ml-3 text-xs text-[color:var(--color-success)]">Uploaded — verification pending.</span>
            }
          </div>
        </form>
      </app-card>
    }
  `,
  styles: `
    .field {
      height: 40px;
      padding: 0 12px;
      border: 1px solid var(--color-neutral-200);
      border-radius: var(--radius-input);
      font-size: 0.875rem;
      background: var(--color-neutral-0);
    }
    textarea.field { height: auto; padding: 10px 12px; resize: vertical; }
    .chip {
      cursor: pointer;
      padding: 6px 12px;
      border: 1px solid var(--color-neutral-200);
      border-radius: 9999px;
      font-size: 0.8rem;
      transition: background-color 0.15s, border-color 0.15s;
    }
    .chip.active {
      border-color: var(--color-primary-700);
      background: var(--color-primary-50);
      color: var(--color-primary-700);
      font-weight: 600;
    }
  `
})
export class DoctorProfilePage {
  private readonly api = inject(DoctorApi);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly profile = signal<DoctorProfileDto | null>(null);
  protected readonly specialties = signal<SpecialtyDto[]>([]);
  protected readonly selectedSpecialties = signal<Set<string>>(new Set());
  protected readonly selectedLanguages = signal<Set<string>>(new Set());
  protected readonly languages = LANGUAGES;

  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);
  protected readonly savedAt = signal<number | null>(null);

  protected readonly file = signal<File | null>(null);
  protected readonly uploading = signal(false);
  protected readonly uploadError = signal<string | null>(null);
  protected readonly uploadDone = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    firstName: [''],
    lastName: [''],
    title: [''],
    bio: [''],
    consultationFee: [0]
  });

  protected readonly uploadForm = this.fb.nonNullable.group({
    kind: ['DIPLOMA' as CredentialKind, Validators.required],
    issuer: ['']
  });

  ngOnInit(): void {
    this.api.listSpecialties().subscribe(s => this.specialties.set(s));
    this.refresh();
  }

  private refresh(): void {
    this.loading.set(true);
    this.api.getMine().subscribe({
      next: p => {
        this.profile.set(p);
        this.form.patchValue({
          firstName: p.firstName ?? '',
          lastName: p.lastName ?? '',
          title: p.title ?? '',
          bio: p.bio ?? '',
          consultationFee: p.consultationFee ?? 0
        });
        this.selectedSpecialties.set(new Set(p.specialties.map(s => s.code)));
        this.selectedLanguages.set(new Set(p.languages));
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  protected toggleSpecialty(code: string, ev: Event): void {
    const next = new Set(this.selectedSpecialties());
    if ((ev.target as HTMLInputElement).checked) next.add(code); else next.delete(code);
    this.selectedSpecialties.set(next);
  }
  protected toggleLanguage(tag: string, ev: Event): void {
    const next = new Set(this.selectedLanguages());
    if ((ev.target as HTMLInputElement).checked) next.add(tag); else next.delete(tag);
    this.selectedLanguages.set(next);
  }

  protected save(): void {
    this.saving.set(true);
    this.saveError.set(null);
    const v = this.form.getRawValue();
    this.api.updateMine({
      firstName: v.firstName || null,
      lastName: v.lastName || null,
      title: v.title || null,
      bio: v.bio || null,
      consultationFee: v.consultationFee || null,
      specialties: [...this.selectedSpecialties()],
      languages: [...this.selectedLanguages()]
    }).subscribe({
      next: p => {
        this.profile.set(p);
        this.saving.set(false);
        this.savedAt.set(Date.now());
      },
      error: err => {
        this.saving.set(false);
        this.saveError.set(err?.error?.title ?? 'Save failed.');
      }
    });
  }

  protected onFile(ev: Event): void {
    const f = (ev.target as HTMLInputElement).files?.[0] ?? null;
    this.file.set(f);
    this.uploadDone.set(false);
    this.uploadError.set(null);
  }

  protected upload(): void {
    const f = this.file();
    if (!f) return;
    this.uploading.set(true);
    this.uploadError.set(null);
    this.uploadDone.set(false);

    this.api.uploadCredential(
      f,
      this.uploadForm.controls.kind.value,
      this.uploadForm.controls.issuer.value || null
    ).subscribe({
      next: () => {
        this.uploading.set(false);
        this.uploadDone.set(true);
        this.file.set(null);
        this.uploadForm.reset({ kind: 'DIPLOMA', issuer: '' });
        this.refresh();
      },
      error: err => {
        this.uploading.set(false);
        this.uploadError.set(err?.error?.title ?? err?.error?.detail ?? 'Upload failed.');
      }
    });
  }

  protected formatBytes(b?: number | null): string {
    if (!b) return '—';
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' kB';
    return (b / 1024 / 1024).toFixed(1) + ' MB';
  }

  protected statusVariant(s: CredentialDto['status']): StatusVariant {
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED') return 'error';
    return 'pending';
  }
}
