import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

/**
 * Vite 8. Rolldown + Oxc replace Rollup + esbuild with no opt-out, so:
 *   - it is `build.rolldownOptions`, not `build.rollupOptions`
 *   - it is `oxc: {}`, not `esbuild: {}` (esbuild options are inert)
 *   - object-form `manualChunks` is removed
 *
 * React Compiler is deliberately NOT enabled here. See docs/versions.md — the
 * correctness value is already captured by eslint-plugin-react-hooks 7, and the
 * Rolldown+Babel bridge is the newest integration in this stack. Opting in is
 * two lines when you want it.
 */
const ENV_DIR = fileURLToPath(new URL('../..', import.meta.url));

/**
 * Optional same-origin API proxy, for the httpOnly refresh cookie.
 *
 * Set VITE_API_PROXY_TARGET (e.g. http://localhost:8080) together with
 * VITE_API_URL=/api, and the browser talks only to localhost while Vite forwards
 * to the API. That is not a convenience — it is what makes a cookie possible in
 * dev at all: a cross-site cookie needs `SameSite=None; Secure`, and browsers
 * refuse a Secure cookie over plain `http://` on anything but localhost. Through
 * the proxy the cookie is first-party, so plain `SameSite=Lax` works and no CSRF
 * token is needed.
 *
 * Unset (the default) changes nothing: no proxy is registered and requests go
 * straight to VITE_API_URL exactly as before.
 */
function apiProxy(mode: string) {
  const target = loadEnv(mode, ENV_DIR, 'VITE_')['VITE_API_PROXY_TARGET'];
  if (!target) return undefined;

  return {
    '/api': {
      target,
      changeOrigin: true,
      // The API has no /api prefix — the segment exists only to give the proxy
      // something to match on.
      rewrite: (path: string) => path.replace(/^\/api/, ''),
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  /**
   * Load .env from the MONOREPO ROOT, not from apps/web.
   *
   * Vite's `envDir` defaults to the project root — the directory holding this
   * config — so without this line it reads `apps/web/.env`, which does not exist.
   * Meanwhile `.env.example` and docs/env-vars.md both name the repo-root `.env`
   * as the source of truth, and `.gitignore` ignores it there.
   *
   * The failure that causes is silent and misleading: `VITE_API_URL` comes back
   * undefined, app-runtime.ts falls back to `window.location.origin`, and every
   * API call goes to the Vite dev server itself (http://localhost:5173), which
   * answers with index.html — so requests "succeed" and then fail zod parsing,
   * which reads as a broken backend rather than missing configuration.
   *
   * Real environment variables still win over .env files, so the explicit env in
   * playwright.config.ts continues to override this.
   */
  envDir: ENV_DIR,

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    // Shared workspace packages are raw TypeScript source, and Vite dedupes
    // React for them via the single hoisted copy. If you ever see two Reacts,
    // run `node scripts/assert-single-version.mjs` rather than adding entries
    // here.
    dedupe: ['react', 'react-dom', '@tanstack/react-query'],
  },

  server: {
    port: 5173,
    strictPort: true,
    proxy: apiProxy(mode),
  },

  build: {
    outDir: 'dist',
    sourcemap: true,
    // Fail the build if a chunk balloons; bundle size is a standing concern.
    chunkSizeWarningLimit: 600,
  },
}));
