# Build and run the NestJS backend.
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm install

# Copy the source and compile TypeScript -> JavaScript (dist/).
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
