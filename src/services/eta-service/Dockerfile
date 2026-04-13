FROM node:18-alpine

WORKDIR /app

# Copy package definitions and install dependencies
COPY package.json ./
RUN npm install --production

# Copy source code
COPY . ./

EXPOSE 3012

CMD ["node", "server.js"]
