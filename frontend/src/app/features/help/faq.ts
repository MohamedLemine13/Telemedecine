import { Component, signal } from '@angular/core';

import { Card, PageHeader } from '../../shared/ui';

interface QA { q: string; a: string; }

/** Accordion FAQ for patients and doctors. */
@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [Card, PageHeader],
  template: `
    <app-page-header title="Help & FAQ" subtitle="Answers to the most common questions." />
    <section class="mx-auto max-w-3xl">
      <app-card>
        <ul class="divide-y divide-[color:var(--color-neutral-200)]">
          @for (item of faqs; track item.q; let i = $index) {
            <li class="py-1">
              <button type="button" class="qrow" (click)="toggle(i)">
                <span class="font-semibold text-sm">{{ item.q }}</span>
                <span class="text-[color:var(--color-neutral-400)]">{{ open() === i ? '−' : '+' }}</span>
              </button>
              @if (open() === i) {
                <p class="pb-3 text-sm leading-relaxed text-[color:var(--color-neutral-600)]">{{ item.a }}</p>
              }
            </li>
          }
        </ul>
      </app-card>
    </section>
  `,
  styles: `
    .qrow {
      width: 100%; display: flex; align-items: center; justify-content: space-between;
      padding: 12px 0; background: transparent; border: 0; cursor: pointer; text-align: left;
    }
  `
})
export class Faq {
  protected readonly open = signal<number | null>(0);

  protected toggle(i: number): void {
    this.open.set(this.open() === i ? null : i);
  }

  protected readonly faqs: QA[] = [
    { q: 'How do I book a consultation?',
      a: 'Patients: go to "Find a doctor", open a verified doctor and pick an open slot. The appointment then appears under "Appointments".' },
    { q: 'How do I start a video or phone call?',
      a: 'Open the appointment at its scheduled time and click "Join call". The call connects through the integrated video service; if video fails, the app automatically retries on an alternative route.' },
    { q: 'I am a doctor — why can\'t I see my space?',
      a: 'New doctors must complete their public profile first. Once your name and specialty are saved you get full access to the agenda, patients and consultations.' },
    { q: 'How do I set my availability?',
      a: 'Doctors: open "Availability", add weekly blocks (day, start, end and slot length). Overlapping blocks on the same day are rejected with a clear message. Patients then book against the generated slots.' },
    { q: 'Where are my prescriptions?',
      a: 'Patients find every prescription under "Prescriptions" and can download each as a PDF. Doctors issue them from "New prescription" tied to an appointment.' },
    { q: 'How does billing work?',
      a: 'Invoices are generated automatically when a consultation is completed. Payment and the 70% reimbursement are simulated — no real money changes hands.' },
    { q: 'Are messages real-time?',
      a: 'Yes. Messages are delivered instantly over a WebSocket while you have the thread open, with a polling fallback so nothing is lost if the connection drops.' }
  ];
}
