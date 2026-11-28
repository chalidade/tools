# Debian with a few fonts, so text watermarks render the same everywhere
# (sharp's own libvips/librsvg finds them through fontconfig).
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        fonts-dejavu-core fonts-liberation2 fonts-noto-core fonts-noto-cjk fontconfig \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && echo "Node.js $(node --version)"

COPY . ./

USER node

CMD ["npm", "start", "--silent"]
