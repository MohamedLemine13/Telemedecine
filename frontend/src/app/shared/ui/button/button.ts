import { Component, computed, input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Primitive button — token-driven, no hardcoded colours.
 * Used as `<button app-button variant="primary" size="md">…</button>` via
 * attribute selector so it slots into native `<button>` element semantics.
 */
@Component({
  selector: 'button[app-button], a[app-button]',
  standalone: true,
  template: `<ng-content />`,
  host: {
    '[class]': 'classes()',
    '[attr.disabled]': 'disabled() ? "" : null',
    '[attr.aria-busy]': 'loading() ? "true" : null'
  }
})
export class Button {
  readonly variant = input<ButtonVariant>('primary');
  readonly size = input<ButtonSize>('md');
  readonly disabled = input<boolean>(false);
  readonly loading = input<boolean>(false);
  readonly fullWidth = input<boolean>(false);

  readonly classes = computed(() => [
    'inline-flex items-center justify-center gap-2 font-semibold rounded-[var(--radius-input)]',
    'transition-colors transition-shadow focus-visible:outline focus-visible:outline-2',
    'focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary-700)]',
    'disabled:cursor-not-allowed disabled:opacity-50',
    this.fullWidth() ? 'w-full' : '',
    SIZE[this.size()],
    VARIANT[this.variant()]
  ].filter(Boolean).join(' '));
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-5 text-base'
};

const VARIANT: Record<ButtonVariant, string> = {
  primary:
    'bg-[color:var(--color-primary-700)] text-[color:var(--color-neutral-0)] ' +
    'hover:bg-[color:var(--color-primary-500)] shadow-[var(--shadow-1)]',
  secondary:
    'border border-[color:var(--color-primary-700)] text-[color:var(--color-primary-700)] ' +
    'bg-[color:var(--color-neutral-0)] hover:bg-[color:var(--color-primary-50)]',
  tertiary:
    'text-[color:var(--color-primary-700)] hover:bg-[color:var(--color-primary-50)] bg-transparent',
  danger:
    'bg-[color:var(--color-error)] text-[color:var(--color-neutral-0)] hover:opacity-90',
  ghost:
    'text-[color:var(--color-neutral-900)] hover:bg-[color:var(--color-neutral-50)] bg-transparent'
};
