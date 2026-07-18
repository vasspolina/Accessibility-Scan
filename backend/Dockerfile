FROM mcr.microsoft.com/playwright:v1.48.2-jammy

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

ENV NODE_ENV=production
EXPOSE 8787

CMD ["node", "dist/server.js"]
