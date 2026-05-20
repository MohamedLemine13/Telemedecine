export const environment = {
  production: true,
  apiBaseUrl: '/api',
  livekitUrl: 'wss://livekit.telemedecine.example',
  defaultLocale: 'fr-FR',
  supportedLocales: ['fr-FR', 'en-US'] as const,
  currency: { code: 'MRU', symbol: 'UM' }
};
