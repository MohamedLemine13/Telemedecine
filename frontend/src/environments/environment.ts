/**
 * Default environment (development). Other targets replace this file via the
 * `fileReplacements` block in angular.json.
 */
export const environment = {
  production: false,
  // Relative — see environment.development.ts for the rationale.
  apiBaseUrl: '',
  livekitUrl: 'ws://localhost:7880',
  defaultLocale: 'fr-FR',
  supportedLocales: ['fr-FR', 'en-US'] as const,
  currency: { code: 'MRU', symbol: 'UM' }
};
