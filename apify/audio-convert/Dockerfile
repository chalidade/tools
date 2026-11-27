# ffmpeg from Debian (x264, x265, VP9, AV1 via libaom/dav1d, AAC, Opus, MP3).
FROM node:22-bookworm-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && echo "Node.js $(node --version), npm $(npm --version), $(ffmpeg -version | head -1)"

COPY . ./

USER node

CMD ["npm", "start", "--silent"]
