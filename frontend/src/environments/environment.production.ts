export const environment = {
  production: true,
  // Empty string → same-origin. Every API service already prefixes paths with
  // /api/..., and nginx (or any production reverse proxy) routes those to the
  // backend. A non-empty value here would double the prefix (/api/api/...).
  apiBaseUrl: '',
  // Informational only — the consultation room uses the livekitUrl returned by
  // POST /api/consultations/{id}/join, falling back to the same-origin /lk proxy.
  livekitUrl: '',
  defaultLocale: 'fr-FR',
  supportedLocales: ['fr-FR', 'en-US'] as const,
  currency: { code: 'MRU', symbol: 'UM' }
};
