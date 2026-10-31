# -----------------------------------------------------------------------------
# Runflare / Dockerfile for Aramash Nursing Clinic Platform (Next.js 16)
# -----------------------------------------------------------------------------

FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

# Step 1: Dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# Step 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy values for build-time page data collection (runtime uses real secrets from Runflare env)
ENV DATABASE_URL=postgresql://build_user:dummy@localhost:5432/build_dummy
ENV OTP_SECRET=build-dummy-secret-at-least-32-characters-long
RUN npm run build

# Step 3: Runner
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json

USER nextjs

EXPOSE 3000

CMD ["npm", "run", "start"]
