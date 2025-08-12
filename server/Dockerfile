FROM node:20-alpine

WORKDIR /app

# Install runtime deps (no local package.json available)
RUN npm init -y && npm config set strict-ssl false && npm i express cors

# Copy server entry
COPY simple-http-server.js ./simple-http-server.js

EXPOSE 4000

CMD ["node", "simple-http-server.js"]

