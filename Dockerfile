# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY package*.json ./

# Copy necessary files
COPY .env.production ./.env
COPY public ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S micall -u 1001
RUN chown -R micall:nodejs /app
USER micall

EXPOSE 3000

CMD ["npm", "start"] 