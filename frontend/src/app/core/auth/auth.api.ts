import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role } from './auth.store';

/**
 * Marker context token for requests that the auth interceptor should skip
 * (e.g. the /refresh call itself, to avoid infinite loops on 401).
 */
export const SKIP_AUTH = new HttpContextToken<boolean>(() => false);

export interface SignupRequest {
  email: string;
  password: string;
  role: Role;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  accessExpiresIn: number;
  tokenType: 'Bearer';
}

export interface TfaChallengeResponse {
  challengeToken: string;
  purpose: 'tfa_challenge';
}

export interface LoginResponse {
  tokens?: TokenResponse;
  tfa?: TfaChallengeResponse;
}

export interface TfaSetupResponse {
  secret: string;
  provisioningUri: string;
}

export interface TfaVerifyLoginRequest {
  challengeToken: string;
  code: string;
}

export interface TfaVerifyRequest {
  code: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/**
 * Thin HTTP wrapper around the backend's /api/auth/* endpoints.
 * All Observables emit on success and throw the backend's RFC-7807 `ApiError`
 * (passed through by the error interceptor).
 */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/auth`;

  signup(req: SignupRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/signup`, req, this.skipAuth());
  }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.base}/login`, req, this.skipAuth());
  }

  refresh(refreshToken: string): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(
      `${this.base}/refresh`,
      { refreshToken },
      this.skipAuth()
    );
  }

  logout(refreshToken: string): Observable<void> {
    return this.http.post<void>(`${this.base}/logout`, { refreshToken }, this.skipAuth());
  }

  verifyTfaLogin(req: TfaVerifyLoginRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/2fa/verify`, req, this.skipAuth());
  }

  beginTfaSetup(): Observable<TfaSetupResponse> {
    return this.http.post<TfaSetupResponse>(`${this.base}/2fa/setup`, {});
  }

  enableTfa(req: TfaVerifyRequest): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(`${this.base}/2fa/enable`, req);
  }

  disableTfa(req: TfaVerifyRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/2fa/disable`, req);
  }

  /** Changes the signed-in user's password; the backend revokes refresh tokens. */
  changePassword(req: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.base}/password/change`, req);
  }

  private skipAuth() {
    return { context: new HttpContext().set(SKIP_AUTH, true) };
  }
}
