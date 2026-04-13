FROM node:18-alpine

WORKDIR /app

# Copy package definitions and install dependencies
COPY src/services/tracking-service/package.json ./
RUN npm install --production

# Copy source code relative to the build context
COPY src/services/tracking-service/ ./

EXPOSE 3011

CMD ["node", "server.js"]
