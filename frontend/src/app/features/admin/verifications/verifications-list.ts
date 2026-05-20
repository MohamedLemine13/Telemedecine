import { SlicePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AdminApi, VerificationCaseDto, VerificationStatus } from '../admin.api';
import { Card, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

@Component({
  selector: 'app-verifications-list',
  standalone: true,
  imports: [RouterLink, Card, SlicePipe, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Doctor verifications"
                     subtitle="Review submitted credentials and approve or reject doctor profiles." />


    <div class="mb-4 flex gap-1">
      @for (f of filters; track f.value) {
        <button type="button" (click)="changeFilter(f.value)"
          [class]="current() === f.value ? 'filter-active' : 'filter'">
          {{ f.label }}
        </button>
      }
    </div>

    <app-card>
      <div header><h2 class="text-base font-semibold">Cases</h2></div>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (cases().length === 0) {
        <p class="py-8 text-center text-sm text-[color:var(--color-neutral-500)]">
          No verification cases in this state.
        </p>
      } @else {
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[color:var(--color-neutral-200)] text-left">
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Doctor</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Specialties</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Credentials</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Status</th>
              <th class="py-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-neutral-500)]">Submitted</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            @for (c of cases(); track c.id) {
              <tr class="border-b border-[color:var(--color-neutral-200)] last:border-0">
                <td class="py-3">
                  <p class="font-semibold">
                    {{ c.doctor?.firstName }} {{ c.doctor?.lastName }}
                    @if (!c.doctor?.firstName) { <span class="text-[color:var(--color-neutral-500)]">(no name set)</span> }
                  </p>
                  <p class="text-xs text-[color:var(--color-neutral-500)]">{{ c.doctor?.email }}</p>
                </td>
                <td class="py-3 text-xs">
                  @for (s of c.doctor?.specialties ?? []; track s.id) {
                    <span class="mr-1 rounded bg-[color:var(--color-neutral-50)] px-1.5 py-0.5">{{ s.labelEn }}</span>
                  } @empty {
                    <span class="text-[color:var(--color-neutral-500)]">—</span>
                  }
                </td>
                <td class="py-3">{{ c.doctor?.credentials?.length ?? 0 }}</td>
                <td class="py-3"><app-status-badge [variant]="badge(c.status)" [label]="c.status" /></td>
                <td class="py-3 text-xs text-[color:var(--color-neutral-500)]">{{ c.createdAt | slice:0:10 }}</td>
                <td class="py-3 text-right">
                  <a [routerLink]="['/admin/verifications', c.id]"
                     class="text-sm font-semibold text-[color:var(--color-primary-700)] hover:underline">
                    Review →
                  </a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </app-card>
  `,
  styles: `
    .filter, .filter-active {
      padding: 6px 14px;
      border: 1px solid var(--color-neutral-200);
      border-radius: 9999px;
      background: var(--color-neutral-0);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }
    .filter-active {
      background: var(--color-primary-50);
      color: var(--color-primary-700);
      border-color: var(--color-primary-700);
    }
  `
})
export class VerificationsList implements OnInit {
  private readonly api = inject(AdminApi);

  protected readonly filters: { label: string; value: VerificationStatus | 'ALL' }[] = [
    { label: 'Pending',   value: 'PENDING' },
    { label: 'Approved',  value: 'APPROVED' },
    { label: 'Rejected',  value: 'REJECTED' },
    { label: 'All',       value: 'ALL' }
  ];
  protected readonly current = signal<VerificationStatus | 'ALL'>('PENDING');

  protected readonly cases = signal<VerificationCaseDto[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void { this.fetch(); }

  protected changeFilter(v: VerificationStatus | 'ALL'): void {
    this.current.set(v);
    this.fetch();
  }

  private fetch(): void {
    this.loading.set(true);
    const status = this.current() === 'ALL' ? undefined : this.current() as VerificationStatus;
    this.api.list(status).subscribe({
      next: page => { this.cases.set(page.content); this.loading.set(false); },
      error: () => { this.cases.set([]); this.loading.set(false); }
    });
  }

  protected badge(s: VerificationStatus): StatusVariant {
    if (s === 'APPROVED') return 'success';
    if (s === 'REJECTED') return 'error';
    return 'pending';
  }
}
