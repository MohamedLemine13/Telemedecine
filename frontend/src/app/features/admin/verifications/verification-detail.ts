import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AdminApi, VerificationCaseDto } from '../admin.api';
import { Button, Card, StatusBadge, StatusVariant } from '../../../shared/ui';

@Component({
  selector: 'app-verification-detail',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, Button, Card, StatusBadge],
  template: `
    <a routerLink="/admin/verifications"
       class="mb-4 inline-block text-sm font-semibold text-[color:var(--color-primary-700)] hover:underline">
      ← Back to verifications
    </a>

    @if (loading()) {
      <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
    } @else if (vcase(); as c) {
      <header class="mb-6 flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold">{{ c.doctor?.firstName }} {{ c.doctor?.lastName }}</h1>
          <p class="mt-1 text-sm text-[color:var(--color-neutral-500)]">{{ c.doctor?.email }}</p>
        </div>
        <app-status-badge [variant]="badge(c.status)" [label]="c.status" />
      </header>

      <section class="grid gap-4 lg:grid-cols-3">
        <!-- Doctor info -->
        <app-card class="lg:col-span-2">
          <div header><h2 class="text-base font-semibold">Doctor information</h2></div>
          <dl class="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Title</dt>
              <dd>{{ c.doctor?.title || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Consultation fee</dt>
              <dd>{{ c.doctor?.consultationFee }} {{ c.doctor?.currency }}</dd>
            </div>
            <div class="md:col-span-2">
              <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Bio</dt>
              <dd>{{ c.doctor?.bio || '—' }}</dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Specialties</dt>
              <dd>
                @for (s of c.doctor?.specialties ?? []; track s.id) {
                  <span class="mr-1 inline-block rounded bg-[color:var(--color-primary-50)] px-1.5 py-0.5 text-xs">{{ s.labelEn }}</span>
                } @empty { — }
              </dd>
            </div>
            <div>
              <dt class="text-xs font-semibold text-[color:var(--color-neutral-500)]">Languages</dt>
              <dd>{{ (c.doctor?.languages ?? []).join(', ') || '—' }}</dd>
            </div>
          </dl>
        </app-card>

        <!-- Decision -->
        <app-card>
          <div header><h2 class="text-base font-semibold">Decision</h2></div>
          @if (c.decidedAt) {
            <p class="text-sm">
              <strong>{{ c.status }}</strong> on {{ c.decidedAt }}
            </p>
            @if (c.decisionNote) {
              <p class="mt-2 text-sm text-[color:var(--color-neutral-500)]">{{ c.decisionNote }}</p>
            }
            <p class="mt-3 text-xs text-[color:var(--color-neutral-500)]">
              You can re-decide if the doctor uploads new credentials.
            </p>
          }
          <form [formGroup]="form" class="mt-3 flex flex-col gap-3">
            <label class="flex flex-col gap-1.5">
              <span class="text-xs font-semibold">Note (optional)</span>
              <textarea formControlName="note" rows="3"
                class="rounded-[var(--radius-input)] border border-[color:var(--color-neutral-200)] p-2 text-sm"></textarea>
            </label>
            <div class="flex gap-2">
              <button app-button (click)="approve()" [loading]="working() === 'approve'" type="button">
                Approve
              </button>
              <button app-button variant="danger" (click)="reject()" [loading]="working() === 'reject'" type="button">
                Reject
              </button>
            </div>
            @if (decisionError()) {
              <p class="text-xs text-[color:var(--color-error)]">{{ decisionError() }}</p>
            }
          </form>
        </app-card>
      </section>

      <!-- Credentials -->
      <app-card class="mt-4">
        <div header><h2 class="text-base font-semibold">Submitted credentials</h2></div>
        @if ((c.doctor?.credentials?.length ?? 0) === 0) {
          <p class="py-4 text-center text-sm text-[color:var(--color-neutral-500)]">
            No credentials uploaded yet.
          </p>
        } @else {
          <ul class="divide-y divide-[color:var(--color-neutral-200)]">
            @for (cred of c.doctor?.credentials ?? []; track cred.id) {
              <li class="flex items-center justify-between py-3">
                <div>
                  <p class="text-sm font-semibold">{{ cred.kind }} — {{ cred.documentName }}</p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">
                    {{ cred.issuer || 'Issuer unknown' }} · {{ cred.contentType }}
                  </p>
                </div>
                <button type="button" (click)="download(cred.id)"
                  class="text-sm font-semibold text-[color:var(--color-primary-700)] hover:underline">
                  Download →
                </button>
              </li>
            }
          </ul>
        }
      </app-card>
    }
  `
})
export class VerificationDetail implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly vcase = signal<VerificationCaseDto | null>(null);
  protected readonly working = signal<'approve' | 'reject' | null>(null);
  protected readonly decisionError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({ note: [''] });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')!;
    this.api.get(id).subscribe({
      next: c => { this.vcase.set(c); this.loading.set(false); },
      error: () => { this.loading.set(false); this.router.navigateByUrl('/admin/verifications'); }
    });
  }

  protected approve(): void {
    const id = this.vcase()?.id;
    if (!id) return;
    this.working.set('approve');
    this.decisionError.set(null);
    this.api.approve(id, this.form.controls.note.value).subscribe({
      next: c => { this.vcase.set(c); this.working.set(null); },
      error: err => { this.working.set(null); this.decisionError.set(err?.error?.title ?? 'Approve failed.'); }
    });
  }

  protected reject(): void {
    const id = this.vcase()?.id;
    if (!id) return;
    this.working.set('reject');
    this.decisionError.set(null);
    this.api.reject(id, this.form.controls.note.value).subscribe({
      next: c => { this.vcase.set(c); this.working.set(null); },
      error: err => { this.working.set(null); this.decisionError.set(err?.error?.title ?? 'Reject failed.'); }
    });
  }

  protected download(credentialId: string): void {
    const caseId = this.vcase()?.id;
    if (!caseId) return;
    this.api.downloadCredential(caseId, credentialId).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      // Release the object URL after the browser has had a chance to load it.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    });
  }

  protected badge(s: string): StatusVariant {
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED') return 'error';
    return 'pending';
  }
}
