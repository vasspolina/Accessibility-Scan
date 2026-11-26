# Built from the repository root (Railway's root directory is the repo, the
# Dockerfile path backend/Dockerfile, both in /railway.json), so the widget's
# source is in the build context and its bundle is built here, not committed.
# The bundle was committed until 25 Nov 2026: every widget change rewrote one
# 1.2 MB minified line, so every merge of main into a branch conflicted on it
# and had to be rebuilt by hand.

# --- The owner's widget: one self-contained IIFE, served from public/. ---
FROM node:24-bookworm-slim AS widget

WORKDIR /repo
# The widget depends on design-system/production as a file: dependency, so
# that directory has to be in place before npm ci links it.
COPY design-system/production ./design-system/production
COPY widget-business/package.json widget-business/package-lock.json ./widget-business/
RUN cd widget-business && npm ci
COPY widget-business ./widget-business
RUN cd widget-business && npm run build
# The Gemini-style demo's bundle (demo-gemini.html): the same source built
# with its own stylesheet and view. Its mode keeps dist/ as it is, so the
# product bundle above stays beside it.
RUN cd widget-business && npx vite build --mode gemini

# --- The scanner. ---
FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

# playwright's npm package version (package.json) is pinned to match this
# base image's tag exactly — the pre-installed Chromium binary must match
# what the installed npm package expects, or chromium.launch() fails at
# runtime. Bump both together when upgrading Playwright.
COPY backend/package.json backend/package-lock.json ./
# --ignore-scripts: package.json has a `prepare` step that runs tsc, for the
# CLI's git-install path. At this layer there is no tsconfig or src yet —
# they are copied below, on purpose, so a dependency change is the only
# thing that invalidates the npm ci cache — and the build is run explicitly
# further down. Without the flag this layer failed with TS5058 on the
# first deploy after prepare was added.
RUN npm ci --ignore-scripts

COPY backend/tsconfig.json ./
COPY backend/src ./src
COPY backend/public ./public
# The older technical widget (public/widget.js) is still committed: it has
# no tests or CI and rarely changes.
COPY --from=widget /repo/widget-business/dist/widget-business.js ./public/widget-business.js
COPY --from=widget /repo/widget-business/dist/widget-business-gemini.js ./public/widget-business-gemini.js

RUN npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "dist/server.js"]
