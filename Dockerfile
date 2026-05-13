# syntax=docker/dockerfile:1.6
#
# Brand Kit Wizard — production container
# Node 20 + system Chromium so Puppeteer can launch without downloading.
#
FROM node:20-slim

# Install Chromium and the fonts/locales it needs to render real publisher
# pages. ca-certificates is needed for HTTPS; tini gives us proper PID 1
# signal handling so SIGTERM kills the browser cleanly.
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      chromium \
      ca-certificates \
      tini \
      fonts-liberation \
      fonts-noto \
      fonts-noto-cjk \
      fonts-noto-color-emoji \
 && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4000 \
    CHROME_PATH=/usr/bin/chromium \
    PUPPETEER_SKIP_DOWNLOAD=1

WORKDIR /app

# Install production deps first for better layer caching.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the rest of the application.
COPY server.js generate.js ./
COPY lib ./lib
COPY templates ./templates
COPY wizard ./wizard

# Output directory persists generated artifacts across requests. Mount a
# volume here in your deploy target if you want them to survive restarts.
RUN mkdir -p /app/output && chown -R node:node /app

USER node
EXPOSE 4000

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "server.js"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+ (process.env.PORT||4000) +'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
