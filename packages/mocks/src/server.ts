#!/usr/bin/env tsx
/**
 * Standalone mock API for apps/mobile.
 *
 * Run: pnpm mock          (from the repo root)
 * Then: EXPO_PUBLIC_API_URL is derived automatically by
 *       apps/mobile/lib/api-url.ts from the Expo dev-server host, so this works
 *       on a simulator AND on a physical device on the same network.
 *
 * Why a server instead of msw/native: see the comment in src/handlers/index.ts.
 * Same handlers, no Hermes globals required.
 */
import { createMiddleware } from '@mswjs/http-middleware';
import express from 'express';

import { handlers } from './handlers';

const PORT = Number(process.env['MOCK_PORT'] ?? 4000);
const HOST = '0.0.0.0';

const app = express();

// Hand-rolled CORS rather than the `cors` package: four headers, one fewer
// dependency, and it makes explicit that this is dev-only permissiveness.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'mock-api' });
});

app.use(express.json());
app.use(createMiddleware(...handlers));

app.listen(PORT, HOST, () => {
  console.log(`\n  Mock API listening on http://localhost:${String(PORT)}`);
  console.log(`  Health:  http://localhost:${String(PORT)}/health`);
  console.log(`  Sign in: anisha@example.com / password123\n`);
});
