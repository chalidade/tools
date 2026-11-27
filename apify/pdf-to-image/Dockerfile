# Poppler (pdftoppm/pdfinfo) from Debian renders the pages; sharp makes WebP.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends poppler-utils zip \
        fonts-liberation2 fonts-dejavu-core fonts-noto-core fonts-noto-cjk \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && echo "Node.js $(node --version), $(pdftoppm -v 2>&1 | head -1)"

COPY . ./

USER node

CMD ["npm", "start", "--silent"]
