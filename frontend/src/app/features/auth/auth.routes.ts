import { Routes } from '@angular/router';
import { RouteStub } from '../../shared/route-stub/route-stub';

export const authRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.Login),
    data: { title: 'Sign in' }
  },
  {
    path: 'signup',
    loadComponent: () => import('./signup/signup').then(m => m.Signup),
    data: { title: 'Create account' }
  },
  {
    path: '2fa/setup',
    loadComponent: () => import('./tfa-setup/tfa-setup').then(m => m.TfaSetup),
    data: { title: 'Set up 2FA' }
  },
  {
    path: '2fa/verify',
    loadComponent: () => import('./tfa-verify/tfa-verify').then(m => m.TfaVerify),
    data: { title: 'Verify 2FA' }
  },
  // Phase 1b — backend endpoints not yet implemented; stubs keep the URLs reachable.
  { path: 'signup/verify-email', component: RouteStub, data: { title: 'Verify email' } },
  { path: 'password/forgot',     component: RouteStub, data: { title: 'Forgot password' } },
  { path: 'password/reset',      component: RouteStub, data: { title: 'Reset password' } },
  { path: 'sso/callback',        component: RouteStub, data: { title: 'SSO callback' } }
];
