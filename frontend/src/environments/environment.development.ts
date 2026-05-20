export const environment = {
  production: false,
  // Empty string → API calls are same-origin. In Docker the nginx in front of
  // this SPA proxies /api, /ws, /actuator and /v3/api-docs to the backend
  // container, so a relative URL works whether you `npm start` (with the proxy
  // config) or `docker compose up`. Avoids CORS preflight failures entirely.
  apiBaseUrl: '',
  livekitUrl: 'ws://localhost:7880',
  defaultLocale: 'fr-FR',
  supportedLocales: ['fr-FR', 'en-US'] as const,
  currency: { code: 'MRU', symbol: 'UM' }
};
