import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { LanguageSwitcher } from '../../shared/ui';

/**
 * Two-column auth shell, mirroring the middle row of design/Authentication.png.
 * - md+: brand panel left (60%), form card right (40%).
 * - mobile: form card only, brand panel collapses.
 */
@Component({
  selector: 'app-auth-shell',
  standalone: true,
  imports: [RouterOutlet, LanguageSwitcher],
  template: `
    <div class="auth-shell">
      <div class="lang-float"><app-language-switcher /></div>
      <aside class="brand-panel" aria-hidden="true">
        <div class="bg-art">
          <div class="blob blob-a"></div>
          <div class="blob blob-b"></div>
          <div class="blob blob-c"></div>
        </div>
        <div class="brand-inner">
          <div class="brand">
            <span class="brand-mark">⚕</span>
            <span class="brand-name">Telemedecine</span>
          </div>
          <h2 class="hook">Soins à distance,<br/>en toute confiance.</h2>
          <p class="lede">
            Téléconsultations vidéo, ordonnances électroniques, et un dossier
            médical sécurisé — pour patients, médecins et administrateurs.
          </p>
          <ul class="bullets">
            <li>✓ Consultation vidéo HD et chat chiffré</li>
            <li>✓ Profil médical et historique des traitements</li>
            <li>✓ Ordonnances et certificats numériques</li>
          </ul>
        </div>
      </aside>

      <main class="card-wrap">
        <div class="card">
          <router-outlet />
        </div>
        <p class="legal">© 2026 Telemedecine</p>
      </main>
    </div>
  `,
  styles: `
    :host { display: block; }
    .auth-shell {
      display: grid;
      min-height: 100vh;
      grid-template-columns: 1fr;
      background: var(--color-neutral-50);
      position: relative;
    }
    .lang-float { position: absolute; top: 16px; right: 16px; z-index: 10; }
    @media (min-width: 900px) {
      .auth-shell { grid-template-columns: 1.1fr 1fr; }
    }

    /* ── Brand panel ─────────────────────────────────────────────────────── */
    .brand-panel {
      display: none;
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, var(--color-primary-700) 0%, var(--color-primary-900) 100%);
      color: var(--color-neutral-0);
    }
    @media (min-width: 900px) {
      .brand-panel { display: flex; align-items: center; justify-content: center; }
    }

    .bg-art { position: absolute; inset: 0; pointer-events: none; }
    .blob {
      position: absolute;
      border-radius: 9999px;
      filter: blur(60px);
      opacity: 0.55;
    }
    .blob-a {
      width: 380px; height: 380px;
      top: -80px; left: -120px;
      background: var(--color-cyan-500);
    }
    .blob-b {
      width: 320px; height: 320px;
      bottom: -100px; right: -60px;
      background: var(--color-purple-500);
    }
    .blob-c {
      width: 200px; height: 200px;
      top: 40%; left: 50%;
      background: var(--color-primary-500);
    }

    .brand-inner {
      position: relative;
      padding: 64px;
      max-width: 480px;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 36px;
    }
    .brand-mark {
      width: 36px; height: 36px;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.18);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
    }
    .brand-name { font-size: 1.05rem; font-weight: 700; letter-spacing: 0.02em; }

    .hook  { font-size: 2.1rem; font-weight: 700; line-height: 1.15; margin: 0 0 14px; letter-spacing: -0.02em; }
    .lede  { font-size: 0.95rem; line-height: 1.55; opacity: 0.85; margin: 0 0 24px; }
    .bullets {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 8px;
      font-size: 0.85rem;
      opacity: 0.92;
    }
    .bullets li { display: flex; gap: 8px; }

    /* ── Card column ─────────────────────────────────────────────────────── */
    .card-wrap {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      width: 100%;
      max-width: 440px;
      padding: 32px;
      background: var(--color-neutral-0);
      border-radius: var(--radius-card);
      box-shadow: var(--shadow-2);
    }
    .legal {
      margin-top: 18px;
      font-size: 0.72rem;
      color: var(--color-neutral-500);
    }
  `
})
export class AuthShell {}
