import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { NotificationApi, NotificationDto } from '../../../core/api/notification.api';
import { Icon } from '../icon/icon';

/**
 * Topbar notification bell. Polls the unread count every 30s and opens a
 * dropdown feed on click. This is the in-app stand-in for browser push in the
 * school deployment — the same backend events also fan out to email.
 */
@Component({
  selector: 'app-notification-bell',
  standalone: true,
  imports: [DatePipe, Icon],
  template: `
    <div class="bell-wrap">
      <button type="button" class="icon-btn" aria-label="Notifications" (click)="toggle()">
        <app-icon name="bell" [size]="18" />
        @if (unread() > 0) {
          <span class="badge">{{ unread() > 9 ? '9+' : unread() }}</span>
        }
      </button>

      @if (open()) {
        <div class="backdrop" (click)="open.set(false)"></div>
        <div class="panel" role="menu">
          <div class="panel-head">
            <span class="panel-title">Notifications</span>
            @if (unread() > 0) {
              <button type="button" class="link" (click)="markAll($event)">Mark all read</button>
            }
          </div>

          @if (loading()) {
            <p class="empty">Loading…</p>
          } @else if (items().length === 0) {
            <p class="empty">You're all caught up. 🎉</p>
          } @else {
            <ul class="feed">
              @for (n of items(); track n.id) {
                <li class="item" [class.unread]="!n.read" (click)="openItem(n)">
                  <p class="item-title">{{ n.title }}</p>
                  @if (n.body) { <p class="item-body">{{ n.body }}</p> }
                  <p class="item-time">{{ n.createdAt | date:'d MMM, HH:mm' }}</p>
                </li>
              }
            </ul>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host { display: contents; }
    .bell-wrap { position: relative; }
    .icon-btn {
      position: relative; width: 38px; height: 38px; border-radius: 9999px;
      background: var(--color-neutral-50); color: var(--color-neutral-500);
      border: 0; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    }
    .icon-btn:hover { background: var(--color-neutral-100); color: var(--color-neutral-700); }
    .badge {
      position: absolute; top: 2px; right: 1px; min-width: 16px; height: 16px;
      padding: 0 4px; border-radius: 9999px; background: var(--color-error);
      color: #fff; font-size: 0.6rem; font-weight: 700; line-height: 16px;
      border: 2px solid var(--color-neutral-0);
    }
    .backdrop { position: fixed; inset: 0; z-index: 40; }
    .panel {
      position: absolute; top: 46px; right: 0; z-index: 50; width: 340px; max-height: 460px;
      overflow-y: auto; background: var(--color-neutral-0);
      border: 1px solid var(--color-neutral-200); border-radius: var(--radius-card);
      box-shadow: 0 12px 32px rgba(15, 23, 42, 0.16);
    }
    .panel-head {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 14px; border-bottom: 1px solid var(--color-neutral-100);
      position: sticky; top: 0; background: var(--color-neutral-0);
    }
    .panel-title { font-size: 0.85rem; font-weight: 700; }
    .link { background: 0; border: 0; color: var(--color-primary-700); font-size: 0.75rem; font-weight: 600; cursor: pointer; }
    .empty { padding: 28px 14px; text-align: center; font-size: 0.8rem; color: var(--color-neutral-500); }
    .feed { list-style: none; margin: 0; padding: 0; }
    .item { padding: 11px 14px; border-bottom: 1px solid var(--color-neutral-100); cursor: pointer; }
    .item:hover { background: var(--color-neutral-50); }
    .item.unread { background: var(--color-primary-50); }
    .item.unread:hover { background: var(--color-primary-100, #e3e9ff); }
    .item-title { font-size: 0.82rem; font-weight: 600; color: var(--color-neutral-900); margin: 0; }
    .item-body { font-size: 0.76rem; color: var(--color-neutral-600); margin: 2px 0 0; }
    .item-time { font-size: 0.68rem; color: var(--color-neutral-400); margin: 4px 0 0; }
  `
})
export class NotificationBell implements OnInit, OnDestroy {
  private readonly api = inject(NotificationApi);
  private readonly router = inject(Router);

  protected readonly unread = signal(0);
  protected readonly items = signal<NotificationDto[]>([]);
  protected readonly open = signal(false);
  protected readonly loading = signal(false);

  private timer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refreshCount();
    this.timer = setInterval(() => this.refreshCount(), 30_000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  protected toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.load();
  }

  private refreshCount(): void {
    this.api.unreadCount().subscribe({
      next: r => this.unread.set(r.count ?? 0),
      error: () => { /* unauthenticated or offline — leave count as is */ }
    });
  }

  private load(): void {
    this.loading.set(true);
    this.api.list(0, 20).subscribe({
      next: p => { this.items.set(p.content); this.loading.set(false); },
      error: () => { this.items.set([]); this.loading.set(false); }
    });
  }

  protected markAll(ev: Event): void {
    ev.stopPropagation();
    this.api.markAllRead().subscribe({
      next: () => {
        this.unread.set(0);
        this.items.update(list => list.map(n => ({ ...n, read: true })));
      },
      error: () => { /* ignore */ }
    });
  }

  protected openItem(n: NotificationDto): void {
    if (!n.read) {
      this.api.markRead(n.id).subscribe({ next: () => {}, error: () => {} });
      this.unread.update(c => Math.max(0, c - 1));
      this.items.update(list => list.map(x => x.id === n.id ? { ...x, read: true } : x));
    }
    this.open.set(false);
    if (n.link) this.router.navigateByUrl(n.link);
  }
}
