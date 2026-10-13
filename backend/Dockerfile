FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

# playwright's npm package version (package.json) is pinned to match this
# base image's tag exactly — the pre-installed Chromium binary must match
# what the installed npm package expects, or chromium.launch() fails at
# runtime. Bump both together when upgrading Playwright.
COPY package.json package-lock.json ./
# --ignore-scripts: package.json has a `prepare` step that runs tsc, for the
# CLI's git-install path. At this layer there is no tsconfig or src yet —
# they are copied below, on purpose, so a dependency change is the only
# thing that invalidates the npm ci cache — and the build is run explicitly
# further down. Without the flag this layer failed with TS5058 on the
# first deploy after prepare was added.
RUN npm ci --ignore-scripts

COPY tsconfig.json ./
COPY src ./src
# The widget bundles are committed, not built here: the Docker build context
# is this directory alone, so neither widget's source is reachable from this
# image. `npm run build:widgets` (or build:widget-business) compiles them and
# copies dist/*.js into public/; commit the result with the source change, or
# the deploy that follows a merge to main ships the old bundle.
COPY public ./public

RUN npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "dist/server.js"]
