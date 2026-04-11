# Stage 1: Base - Setup the environment
FROM node:22-alpine AS base
WORKDIR /app

# Stage 2: Dependencies - Install everything (including devDeps for the build)
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Stage 3: Build - Compile the application
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 4: Production Dependencies - Clean install only prod dependencies
FROM base AS prod-deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage 5: Runtime - The final lean image
FROM node:22-alpine AS runtime
WORKDIR /app

# Set environment to production
ENV NODE_ENV=production

# Create a non-root user for security
# Alpine node images come with a 'node' user pre-created
USER node

# Copy production dependencies and the build output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Use the 'node' user for the following commands
EXPOSE 4321

CMD ["node", "./dist/server/entry.mjs"]