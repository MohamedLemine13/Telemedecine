import { Injectable, computed, signal } from '@angular/core';

export type Role = 'ROLE_PATIENT' | 'ROLE_DOCTOR' | 'ROLE_ADMIN';

export type RoleShort = 'PATIENT' | 'DOCTOR' | 'ADMIN';

export interface AuthUser {
  id: string;
  email: string;
  roles: Role[];
  tfaVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch millis when the access token expires. */
  accessExpiresAt: number;
}

/**
 * Session store backed by `localStorage`.
 *
 * Phase 1: real session. Mock mode is removed. The store is the single
 * source of truth for "are we logged in?" — guards, interceptor, and
 * components read it through the public signals.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  private static readonly STORAGE_KEY = 'telemed.auth';

  private readonly _user = signal<AuthUser | null>(null);
  private readonly _tokens = signal<AuthTokens | null>(null);

  readonly user = this._user.asReadonly();
  readonly tokens = this._tokens.asReadonly();
  readonly isAuthenticated = computed(() => this._user() !== null && this._tokens() !== null);
  readonly accessToken = computed(() => this._tokens()?.accessToken ?? null);
  readonly refreshToken = computed(() => this._tokens()?.refreshToken ?? null);

  constructor() {
    this.restore();
  }

  /** Persist new tokens + parse user claims from the access JWT. */
  setSession(accessToken: string, refreshToken: string, accessExpiresIn: number): void {
    const user = parseJwtUser(accessToken);
    if (!user) {
      this.clear();
      return;
    }
    const tokens: AuthTokens = {
      accessToken,
      refreshToken,
      accessExpiresAt: Date.now() + accessExpiresIn * 1000
    };
    this._user.set(user);
    this._tokens.set(tokens);
    try {
      localStorage.setItem(AuthStore.STORAGE_KEY, JSON.stringify({ user, tokens }));
    } catch {
      /* SSR / private mode — fine. */
    }
  }

  clear(): void {
    this._user.set(null);
    this._tokens.set(null);
    try {
      localStorage.removeItem(AuthStore.STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  hasRole(role: RoleShort): boolean {
    return this._user()?.roles.includes(`ROLE_${role}` as Role) ?? false;
  }

  /** Used by the root-redirect guard to choose where to land. */
  homePath(): string {
    const roles = this._user()?.roles ?? [];
    if (roles.includes('ROLE_PATIENT')) return '/patient/dashboard';
    if (roles.includes('ROLE_DOCTOR'))  return '/doctor/dashboard';
    if (roles.includes('ROLE_ADMIN'))   return '/admin/dashboard';
    return '/auth/login';
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────
  private restore(): void {
    try {
      const raw = localStorage.getItem(AuthStore.STORAGE_KEY);
      if (!raw) return;
      const { user, tokens } = JSON.parse(raw) as { user: AuthUser; tokens: AuthTokens };
      // Stale access tokens are OK — the interceptor will refresh on the next 401.
      // What matters here is that the refresh token isn't past its own grace window;
      // we don't store its expiry server-side, so trust it until /refresh says otherwise.
      this._user.set(user);
      this._tokens.set(tokens);
    } catch {
      this.clear();
    }
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

function parseJwtUser(jwt: string): AuthUser | null {
  try {
    const payload = JSON.parse(b64UrlDecode(jwt.split('.')[1]));
    return {
      id: String(payload.sub),
      email: String(payload.email ?? ''),
      roles: (payload.roles ?? []) as Role[],
      tfaVerified: Boolean(payload.tfa_verified)
    };
  } catch {
    return null;
  }
}

function b64UrlDecode(s: string): string {
  const pad = '='.repeat((4 - (s.length % 4)) % 4);
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  return atob(b64);
}
