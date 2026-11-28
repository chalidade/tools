FROM apify/actor-node-playwright-chrome:22

COPY --chown=myuser package*.json ./
# Playwright and its Chromium come with the base image; keep that version.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && echo "Node.js $(node --version), npm $(npm --version)"

COPY --chown=myuser . ./

CMD ["npm", "start", "--silent"]
