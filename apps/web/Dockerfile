# Self-host escape hatch for the web app (audit item 3.7). Vercel is the default
# path — this exists for the EC2 + nginx deployments we also run.
#
# Multi-stage, non-root, healthcheck, pinned digests.

# ---- build ------------------------------------------------------------------
FROM node:22.22.0-alpine@sha256:24a5b8bd4d1a0f6f9b0ffca2a52b1a9e1e4dbdaa0bf2b8fc9e37e39f0f8e6dc5 AS build

WORKDIR /repo

RUN corepack enable

# Copy only what the install needs first, so a source-only change does not
# invalidate the dependency layer.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/mocks/package.json ./packages/mocks/
COPY packages/tokens/package.json ./packages/tokens/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile --filter @repo/web...

COPY . .

ARG VITE_API_URL
ARG VITE_APP_ENV=production
ENV VITE_API_URL=$VITE_API_URL \
    VITE_APP_ENV=$VITE_APP_ENV \
    VITE_ENABLE_MOCKS=false

RUN pnpm --filter @repo/web build \
    && node scripts/assert-css-output.mjs apps/web/dist

# ---- serve ------------------------------------------------------------------
FROM nginx:1.27-alpine@sha256:6db391d1c0cfb30588ba0bf72ea999404f2764febf0f1f196acd5867ac7efa7e AS serve

COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/web/dist /usr/share/nginx/html

# nginx:alpine ships an unprivileged `nginx` user; run as it rather than root.
RUN touch /var/run/nginx.pid \
    && chown -R nginx:nginx /var/run/nginx.pid /var/cache/nginx /usr/share/nginx/html

USER nginx

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:8080/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
