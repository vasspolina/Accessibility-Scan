# The command, as an image:
#
#   docker run --rm -v "$PWD:/work" ghcr.io/vasspolina/a11y-scan https://example.com --json report.json
#
# Built from this directory: docker build -f cli.Dockerfile -t a11y-scan .
# Separate from ./Dockerfile, which is the hosted service: that one serves
# the widgets from public/ (with trial fonts that must not be redistributed)
# and starts the server. This one holds the compiled command and its
# browser, nothing else.

FROM mcr.microsoft.com/playwright:v1.61.1-jammy AS build
WORKDIR /app
COPY package.json package-lock.json ./
# --ignore-scripts: prepare runs tsc, and src is not copied yet. See ./Dockerfile.
RUN npm ci --ignore-scripts
COPY tsconfig.json ./
COPY src ./src
RUN npm run build && npm prune --omit=dev

# The same base as the build: the Playwright npm package is pinned to this
# image's tag, and the browser in the image must match it to launch.
FROM mcr.microsoft.com/playwright:v1.61.1-jammy
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Output files (--json, --sarif, …) land in the mounted directory. Root, as
# in ./Dockerfile: Playwright launches Chromium without its sandbox by
# default, and a non-root user could not write into a mounted directory
# owned by the host's user.
WORKDIR /work
ENTRYPOINT ["node", "/app/dist/cli.js"]
CMD ["--help"]
