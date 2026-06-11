import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import { registerChunkReloadListener } from './app/core/chunk-reload';

// Reload once if a stale cached index.html asks for a deleted lazy chunk.
registerChunkReloadListener();

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
