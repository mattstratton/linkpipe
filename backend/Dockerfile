FROM node:18-alpine

# Build arguments
ARG APP_VERSION=1.0.0
ARG NODE_ENV=production

WORKDIR /app

# Install dependencies for building native modules
RUN apk add --no-cache python3 make g++

# Copy workspace package.json first
COPY package*.json ./

# Copy workspace packages
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
COPY frontend/package*.json ./frontend/

# Install workspace dependencies first
RUN npm install --ignore-scripts

# Copy shared module source
COPY shared/ ./shared/

# Copy backend source
COPY backend/ ./backend/

# Copy frontend source
COPY frontend/ ./frontend/

# Install all dependencies and build
WORKDIR /app
RUN npm install --include=dev

# Build shared module first
RUN npm run build --workspace=@linkpipe/shared

# Build frontend for production
RUN npm run build --workspace=@linkpipe/frontend

# Set working directory to backend
WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate

# Build backend for production
RUN npm run build

# Build backend for production
RUN npm run build

# Set environment variables
ENV NODE_ENV=${NODE_ENV}
ENV APP_VERSION=${APP_VERSION}

# Expose port
EXPOSE 8000

# Start production server
CMD ["node", "dist/server.js"] 