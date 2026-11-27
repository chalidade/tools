FROM apify/actor-node:22

COPY --chown=myuser package*.json ./
# Keep optional dependencies: sharp installs its prebuilt libvips through them.
RUN npm --quiet set progress=false \
    && npm install --omit=dev --no-audit --no-fund \
    && echo "Node.js $(node --version), npm $(npm --version)"

COPY --chown=myuser . ./

CMD ["npm", "start", "--silent"]
