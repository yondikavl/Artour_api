## Build command: docker build -t artour-api .

# Stage 1: Build the application
FROM node:lts-alpine3.16 AS builder
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build

# Stage 2: Run the application
FROM node:lts-alpine3.20
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
RUN npm ci --omit=dev
RUN mkdir storages

# Run command on container starting.
CMD ["npm", "run", "start:prod"]