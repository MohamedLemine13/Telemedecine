import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-md p-8 text-center">
      <p class="text-sm uppercase tracking-wide text-[color:var(--color-neutral-500)]">404</p>
      <h1 class="mt-2 text-3xl font-bold">Page not found</h1>
      <p class="mt-3 text-[color:var(--color-neutral-500)]">
        The page you were looking for doesn't exist.
      </p>
      <a routerLink="/" class="mt-6 inline-block text-[color:var(--color-primary-700)] underline">
        Back to home
      </a>
    </section>
  `
})
export class NotFound {}
