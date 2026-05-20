import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

let nextId = 0;

/**
 * Form input primitive — works with reactive forms (ControlValueAccessor)
 * and emits standard `change`/`input` from the underlying native element.
 */
@Component({
  selector: 'app-input',
  standalone: true,
  providers: [
    { provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => Input), multi: true }
  ],
  template: `
    <div class="flex flex-col gap-1.5">
      @if (label()) {
        <label [attr.for]="id()" class="text-xs font-semibold text-[color:var(--color-neutral-900)]">
          {{ label() }}
          @if (required()) {
            <span class="text-[color:var(--color-error)]" aria-hidden="true">*</span>
          }
        </label>
      }
      <input
        [id]="id()"
        [type]="type()"
        [value]="value()"
        [attr.placeholder]="placeholder()"
        [attr.aria-invalid]="error() ? 'true' : null"
        [attr.aria-describedby]="describedBy()"
        [disabled]="disabled()"
        (input)="onInput($event)"
        (blur)="onBlur()"
        [class]="inputClasses()"
      />
      @if (hint() && !error()) {
        <p [id]="id() + '-hint'" class="text-xs text-[color:var(--color-neutral-500)]">{{ hint() }}</p>
      }
      @if (error()) {
        <p [id]="id() + '-error'" class="text-xs text-[color:var(--color-error)]">{{ error() }}</p>
      }
    </div>
  `
})
export class Input implements ControlValueAccessor {
  readonly label = input<string>('');
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'tel'>('text');
  readonly placeholder = input<string>('');
  readonly hint = input<string>('');
  readonly error = input<string>('');
  readonly required = input<boolean>(false);

  readonly id = input<string>(`app-input-${++nextId}`);

  protected readonly value = signal<string>('');
  protected readonly disabled = signal<boolean>(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly describedBy = computed(() =>
    this.error() ? `${this.id()}-error`
      : this.hint() ? `${this.id()}-hint`
      : null
  );

  protected readonly inputClasses = computed(() => {
    const base =
      'h-11 px-3 rounded-[var(--radius-input)] bg-[color:var(--color-neutral-0)] ' +
      'text-sm text-[color:var(--color-neutral-900)] placeholder:text-[color:var(--color-neutral-500)] ' +
      'focus:outline-none focus:border-[color:var(--color-primary-700)] focus:ring-1 ' +
      'focus:ring-[color:var(--color-primary-700)] disabled:bg-[color:var(--color-neutral-50)]';
    const border = this.error()
      ? 'border border-[color:var(--color-error)]'
      : 'border border-[color:var(--color-neutral-200)]';
    return `${base} ${border}`;
  });

  protected onInput(ev: Event): void {
    const v = (ev.target as HTMLInputElement).value;
    this.value.set(v);
    this.onChange(v);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  // ── ControlValueAccessor ────────────────────────────────────────────────
  writeValue(v: string): void {
    this.value.set(v ?? '');
  }
  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
}
