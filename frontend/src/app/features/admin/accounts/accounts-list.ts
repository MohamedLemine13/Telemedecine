import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  AccountSummaryDto, AdminMetricsApi, RoleCode
} from '../admin-metrics.api';
import { Button, Card, EmptyState, PageHeader, StatusBadge, StatusVariant } from '../../../shared/ui';

type RoleFilter = '' | RoleCode;

/**
 * Admin user management: search/filter accounts, suspend or reactivate them,
 * message one user, or broadcast to a whole role. Suspending revokes the
 * target's refresh tokens server-side.
 */
@Component({
  selector: 'app-admin-accounts',
  standalone: true,
  imports: [DatePipe, FormsModule, Button, Card, EmptyState, PageHeader, StatusBadge],
  template: `
    <app-page-header title="Accounts" subtitle="Browse, moderate and message platform users.">
      <button actions app-button variant="secondary" type="button" (click)="openBroadcast()">
        Broadcast notification
      </button>
    </app-page-header>

    <!-- Filters -->
    <app-card class="mb-4">
      <form class="flex flex-wrap items-end gap-3" (ngSubmit)="search()">
        <div class="flex-1 min-w-[200px]">
          <label class="mb-1 block text-xs font-semibold">Search</label>
          <input type="search" [(ngModel)]="q" name="q" placeholder="Email contains…" class="field" />
        </div>
        <div>
          <label class="mb-1 block text-xs font-semibold">Role</label>
          <select [(ngModel)]="role" name="role" class="field">
            <option value="">All roles</option>
            <option value="ROLE_PATIENT">Patients</option>
            <option value="ROLE_DOCTOR">Doctors</option>
            <option value="ROLE_ADMIN">Admins</option>
          </select>
        </div>
        <button app-button type="submit">Apply</button>
      </form>
    </app-card>

    <!-- Results -->
    <app-card>
      @if (loading()) {
        <p class="text-sm text-[color:var(--color-neutral-500)]">Loading…</p>
      } @else if (accounts().length === 0) {
        <app-empty-state icon="🔍" title="No accounts" description="No users match these filters." />
      } @else {
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-left text-xs uppercase tracking-wide text-[color:var(--color-neutral-500)]">
                <th class="py-2 pr-4">Email</th>
                <th class="py-2 pr-4">Roles</th>
                <th class="py-2 pr-4">Status</th>
                <th class="py-2 pr-4">Joined</th>
                <th class="py-2">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-[color:var(--color-neutral-200)]">
              @for (a of accounts(); track a.id) {
                <tr>
                  <td class="py-3 pr-4">
                    <p class="font-medium">{{ a.email }}</p>
                    @if (a.tfaEnabled) { <span class="text-xs text-[color:var(--color-neutral-500)]">2FA on</span> }
                  </td>
                  <td class="py-3 pr-4 text-xs">{{ rolesLabel(a.roles) }}</td>
                  <td class="py-3 pr-4">
                    <app-status-badge [variant]="statusBadge(a.status)" [label]="a.status" />
                  </td>
                  <td class="py-3 pr-4 text-xs text-[color:var(--color-neutral-600)]">
                    {{ a.createdAt | date:'d MMM yyyy' }}
                  </td>
                  <td class="py-3">
                    <div class="flex gap-2">
                      @if (a.status === 'ACTIVE') {
                        <button app-button size="sm" variant="danger" type="button"
                          (click)="suspend(a)" [loading]="working() === a.id">Suspend</button>
                      } @else {
                        <button app-button size="sm" variant="secondary" type="button"
                          (click)="activate(a)" [loading]="working() === a.id">Activate</button>
                      }
                      <button app-button size="sm" variant="tertiary" type="button"
                        (click)="openNotify(a)">Notify</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mt-4 flex items-center justify-between text-xs text-[color:var(--color-neutral-500)]">
          <span>Page {{ page() + 1 }} of {{ totalPages() || 1 }}</span>
          <div class="flex gap-2">
            <button app-button size="sm" variant="secondary" type="button"
              [disabled]="page() === 0" (click)="go(page() - 1)">Prev</button>
            <button app-button size="sm" variant="secondary" type="button"
              [disabled]="page() + 1 >= totalPages()" (click)="go(page() + 1)">Next</button>
          </div>
        </div>
      }
    </app-card>

    <!-- Notify / broadcast modal -->
    @if (modal()) {
      <div class="modal-backdrop" (click)="modal.set(null)">
        <div class="modal" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold">{{ modal()!.kind === 'one' ? 'Notify ' + modal()!.email : 'Broadcast notification' }}</h3>
          @if (modal()!.kind === 'broadcast') {
            <div class="mt-3">
              <label class="mb-1 block text-xs font-semibold">Audience</label>
              <select [(ngModel)]="broadcastRole" class="field">
                <option value="">Everyone</option>
                <option value="ROLE_PATIENT">All patients</option>
                <option value="ROLE_DOCTOR">All doctors</option>
                <option value="ROLE_ADMIN">All admins</option>
              </select>
            </div>
          }
          <div class="mt-3">
            <label class="mb-1 block text-xs font-semibold">Title</label>
            <input type="text" [(ngModel)]="msgTitle" maxlength="200" class="field" />
          </div>
          <div class="mt-3">
            <label class="mb-1 block text-xs font-semibold">Message</label>
            <textarea [(ngModel)]="msgBody" rows="4" maxlength="2000" class="field"></textarea>
          </div>
          @if (modalNote()) { <p class="mt-2 text-xs text-[color:var(--color-success,#16a34a)]">{{ modalNote() }}</p> }
          <div class="mt-4 flex justify-end gap-2">
            <button app-button variant="secondary" type="button" (click)="modal.set(null)">Cancel</button>
            <button app-button type="button" (click)="sendModal()" [loading]="sending()"
              [disabled]="!msgTitle.trim()">Send</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .field {
      width: 100%; padding: 9px 12px; font-size: 0.85rem;
      border: 1px solid var(--color-neutral-200); border-radius: var(--radius-input);
      background: var(--color-neutral-0); outline: 0;
    }
    .field:focus { border-color: var(--color-primary-700); }
    textarea.field { resize: vertical; font-family: inherit; }
    .modal-backdrop {
      position: fixed; inset: 0; z-index: 60; background: rgba(15,23,42,0.4);
      display: flex; align-items: center; justify-content: center; padding: 16px;
    }
    .modal {
      width: 100%; max-width: 440px; background: var(--color-neutral-0);
      border-radius: var(--radius-card); padding: 20px; box-shadow: 0 20px 50px rgba(0,0,0,0.25);
    }
  `
})
export class AdminAccounts implements OnInit {
  private readonly api = inject(AdminMetricsApi);

  protected readonly loading = signal(true);
  protected readonly accounts = signal<AccountSummaryDto[]>([]);
  protected readonly page = signal(0);
  protected readonly totalPages = signal(0);
  protected readonly working = signal<string | null>(null);

  protected q = '';
  protected role: RoleFilter = '';

  protected readonly modal = signal<{ kind: 'one' | 'broadcast'; id?: string; email?: string } | null>(null);
  protected readonly modalNote = signal<string | null>(null);
  protected readonly sending = signal(false);
  protected msgTitle = '';
  protected msgBody = '';
  protected broadcastRole: RoleFilter = '';

  ngOnInit(): void { this.fetch(); }

  protected search(): void { this.page.set(0); this.fetch(); }
  protected go(p: number): void { this.page.set(p); this.fetch(); }

  private fetch(): void {
    this.loading.set(true);
    this.api.accounts({
      q: this.q || undefined,
      role: this.role || undefined,
      page: this.page(),
      size: 20
    }).subscribe({
      next: pg => { this.accounts.set(pg.content); this.totalPages.set(pg.totalPages); this.loading.set(false); },
      error: () => { this.accounts.set([]); this.loading.set(false); }
    });
  }

  protected suspend(a: AccountSummaryDto): void {
    if (!confirm(`Suspend ${a.email}? They will be signed out.`)) return;
    this.working.set(a.id);
    this.api.suspend(a.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.fetch(); }
    });
  }

  protected activate(a: AccountSummaryDto): void {
    this.working.set(a.id);
    this.api.activate(a.id).subscribe({
      next: () => { this.working.set(null); this.fetch(); },
      error: () => { this.working.set(null); this.fetch(); }
    });
  }

  protected openNotify(a: AccountSummaryDto): void {
    this.resetModal();
    this.modal.set({ kind: 'one', id: a.id, email: a.email });
  }

  protected openBroadcast(): void {
    this.resetModal();
    this.modal.set({ kind: 'broadcast' });
  }

  private resetModal(): void {
    this.msgTitle = ''; this.msgBody = ''; this.broadcastRole = '';
    this.modalNote.set(null);
  }

  protected sendModal(): void {
    const m = this.modal();
    if (!m || !this.msgTitle.trim()) return;
    this.sending.set(true);
    const done = (note: string) => { this.sending.set(false); this.modalNote.set(note); };
    if (m.kind === 'one' && m.id) {
      this.api.notifyOne(m.id, this.msgTitle.trim(), this.msgBody.trim()).subscribe({
        next: () => { done('Sent ✓'); setTimeout(() => this.modal.set(null), 800); },
        error: () => { this.sending.set(false); this.modalNote.set('Failed to send.'); }
      });
    } else {
      this.api.broadcast(this.msgTitle.trim(), this.msgBody.trim(), this.broadcastRole || undefined).subscribe({
        next: r => { done(`Sent to ${r.sent} user(s) ✓`); },
        error: () => { this.sending.set(false); this.modalNote.set('Failed to send.'); }
      });
    }
  }

  protected rolesLabel(roles: string[]): string {
    return roles.map(r => r.replace('ROLE_', '').toLowerCase()).join(', ');
  }

  protected statusBadge(s: string): StatusVariant {
    return s === 'ACTIVE' ? 'success' : 'error';
  }
}
