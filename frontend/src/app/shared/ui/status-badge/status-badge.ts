import { Component, computed, input } from '@angular/core';

export type StatusVariant =
  | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'pending';

/**
 * Rounded-pill status badge with light-tint background + matching dark text.
 * Matches the Figma "Preclinic" status pills on appointment/verification rows.
 *
 *   <app-status-badge variant="success" label="APPROVED" />
 */
@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `<span [class]="className()">{{ label() }}</span>`,
  styles: `
    :host { display: inline-flex; }
    .pill {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 600;
      letter-spacing: 0.02em;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .success  { background: var(--color-success-50);      color: var(--color-success); }
    .warning  { background: var(--color-warning-50);      color: var(--color-warning); }
    .error    { background: var(--color-error-50);        color: var(--color-error); }
    .info     { background: var(--color-info-50);         color: var(--color-info); }
    .pending  { background: var(--color-purple-50);       color: var(--color-purple-500); }
    .neutral  { background: var(--color-neutral-pill-bg); color: var(--color-neutral-pill-fg); }
  `
})
export class StatusBadge {
  readonly variant = input<StatusVariant>('neutral');
  readonly label = input.required<string>();

  protected readonly className = computed(() => `pill ${this.variant()}`);
}
