import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  DoctorApi,
  DoctorProfileDto,
  SpecialtyDto
} from '../../doctor/doctor.api';
import { Card, EmptyState } from '../../../shared/ui';

const LANGUAGES = [
  { tag: 'fr', label: 'Français' },
  { tag: 'en', label: 'English' },
  { tag: 'ar', label: 'العربية' }
];

@Component({
  selector: 'app-doctors-search',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Card, EmptyState],
  template: `
    <header class="mb-6">
      <h1 class="text-2xl font-bold text-[color:var(--color-neutral-900)]">Find a doctor</h1>
      <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">
        Search verified doctors by specialty and language.
      </p>
    </header>

    <app-card class="mb-6">
      <form [formGroup]="form" (ngSubmit)="search()" class="grid gap-3 md:grid-cols-4">
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold">Specialty</span>
          <select formControlName="specialty" class="field">
            <option value="">Any</option>
            @for (s of specialties(); track s.id) {
              <option [value]="s.code">{{ s.labelEn }}</option>
            }
          </select>
        </label>
        <label class="flex flex-col gap-1.5">
          <span class="text-xs font-semibold">Language</span>
          <select formControlName="language" class="field">
            <option value="">Any</option>
            @for (l of languages; track l.tag) {
              <option [value]="l.tag">{{ l.label }}</option>
            }
          </select>
        </label>
        <div class="flex items-end md:col-span-2">
          <button type="submit"
            class="h-10 rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-4 text-sm font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
            Search
          </button>
        </div>
      </form>
    </app-card>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Searching…</p>
    } @else if (results().length === 0) {
      <app-empty-state
        icon="🔎"
        title="No doctors match these filters."
        description="Try widening your search or check back later — newly verified doctors appear here.">
      </app-empty-state>
    } @else {
      <p class="mb-3 text-xs text-[color:var(--color-neutral-500)]">{{ results().length }} verified doctor(s)</p>
      <ul class="grid gap-3 md:grid-cols-2">
        @for (d of results(); track d.id) {
          <li class="rounded-[var(--radius-card)] bg-[color:var(--color-neutral-0)] p-4 shadow-[var(--shadow-1)]">
            <div class="flex items-start justify-between">
              <div>
                <p class="text-base font-semibold">{{ d.title || 'Dr.' }} {{ d.firstName }} {{ d.lastName }}</p>
                <p class="text-xs text-[color:var(--color-neutral-500)]">
                  @for (s of d.specialties; track s.id) {
                    <span class="mr-1">{{ s.labelEn }}</span>
                  }
                </p>
                <p class="mt-1 text-xs text-[color:var(--color-neutral-500)]">
                  {{ d.languages.join(' · ') || 'languages not set' }}
                </p>
                @if (d.bio) {
                  <p class="mt-2 text-sm">{{ d.bio }}</p>
                }
              </div>
              <span class="rounded-full bg-[color:var(--color-success)]/15 px-2 py-0.5 text-xs font-semibold text-[color:var(--color-success)]">
                ✓ Verified
              </span>
            </div>
            <div class="mt-3 flex items-end justify-between">
              <p class="text-sm">
                <span class="text-lg font-bold">{{ d.consultationFee || '—' }}</span>
                <span class="text-xs text-[color:var(--color-neutral-500)]">
                  {{ d.consultationFee ? d.currency : '' }}
                </span>
              </p>
              <a [routerLink]="['/patient/doctors', d.id]"
                class="rounded-[var(--radius-input)] bg-[color:var(--color-primary-700)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-500)]">
                View profile
              </a>
            </div>
          </li>
        }
      </ul>
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
  `
})
export class DoctorsSearch implements OnInit {
  private readonly api = inject(DoctorApi);
  private readonly fb = inject(FormBuilder);

  protected readonly languages = LANGUAGES;
  protected readonly specialties = signal<SpecialtyDto[]>([]);
  protected readonly results = signal<DoctorProfileDto[]>([]);
  protected readonly loading = signal(true);

  protected readonly form = this.fb.nonNullable.group({
    specialty: [''],
    language: ['']
  });

  ngOnInit(): void {
    this.api.listSpecialties().subscribe(s => this.specialties.set(s));
    this.search();
  }

  protected search(): void {
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.api.search({
      specialty: v.specialty || undefined,
      language: v.language || undefined
    }).subscribe({
      next: page => { this.results.set(page.content); this.loading.set(false); },
      error: () => { this.results.set([]); this.loading.set(false); }
    });
  }
}
