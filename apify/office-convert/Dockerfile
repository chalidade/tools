# LibreOffice (MPL-2.0) headless, from Debian, plus metric-compatible fonts
# (Carlito = Calibri, Caladea = Cambria, Liberation = Arial/Times/Courier)
# and Noto for other scripts, so layouts match the original as closely as
# possible.
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        libreoffice-writer-nogui libreoffice-calc-nogui libreoffice-impress-nogui \
        poppler-utils \
        fonts-liberation2 fonts-crosextra-carlito fonts-crosextra-caladea fonts-dejavu-core \
        fonts-noto-core fonts-noto-cjk fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && echo "Node.js $(node --version), $(soffice --version)"

COPY . ./

USER node

CMD ["npm", "start", "--silent"]
