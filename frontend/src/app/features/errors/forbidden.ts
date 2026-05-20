import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-forbidden',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-md p-8 text-center">
      <p class="text-sm uppercase tracking-wide text-[color:var(--color-error)]">403</p>
      <h1 class="mt-2 text-3xl font-bold">Forbidden</h1>
      <p class="mt-3 text-[color:var(--color-neutral-500)]">
        You do not have permission to view this page.
      </p>
      <a routerLink="/" class="mt-6 inline-block text-[color:var(--color-primary-700)] underline">
        Back to home
      </a>
    </section>
  `
})
export class Forbidden {}
