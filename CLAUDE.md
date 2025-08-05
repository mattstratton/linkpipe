# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LinkPipe is a URL shortener with UTM parameter management built with a serverless-first architecture. It uses a monorepo structure with three main packages:
- **frontend**: React + Vite + Tailwind CSS UI
- **backend**: Express.js (dev) / AWS Lambda (prod) API with DynamoDB
- **shared**: Common TypeScript types and Zod schemas

## Development Commands

### Quick Start
```bash
npm run dev              # Auto-detect ports and start all services with Docker
npm run dev:auto         # Interactive script with port conflict resolution  
npm run dev:win          # Windows version of interactive script
npm run dev:force        # Skip port detection, use existing .env
npm run dev:clean        # Clean containers and start fresh
```

### Build and Deploy
```bash
npm run build            # Build both frontend and backend
npm run clean            # Clean all build artifacts
npm run deploy:aws       # Deploy backend to AWS (from backend/)
npm run deploy:vercel    # Deploy frontend to Vercel (from frontend/)
```

### Package-Specific Commands
```bash
# Frontend (from frontend/ directory)
npm run dev              # Start Vite dev server
npm run build            # Build for production (tsc + vite build)
npm run lint             # ESLint with TypeScript rules
npm run deploy           # Build and deploy to Vercel

# Backend (from backend/ directory)  
npm run dev              # Start Express server with tsx watch
npm run dev:redirect     # Start redirect server separately
npm run build            # TypeScript + Lambda bundling with esbuild
npm run test             # Jest tests
npm run lint             # ESLint
npm run deploy           # Serverless Framework deployment
```

## Architecture & Key Patterns

### Type System
- **Shared types**: All schemas defined in `shared/src/types.ts` using Zod
- **Validation**: Request/response validation with Zod schemas
- **Error handling**: Custom error classes (LinkPipeError, ValidationError, NotFoundError, ConflictError)

### Data Layer
- **Development**: Local DynamoDB via Docker
- **Production**: AWS DynamoDB with SDK v3
- **Schema**: Primary table `linkpipe-urls` with slug as partition key
- **Connection**: DynamoDB client in `backend/src/lib/dynamodb.ts`

### API Structure
- **Development**: Express.js server with CORS and middleware
- **Production**: AWS Lambda functions with API Gateway
- **Routes**: Separated by domain (`/links`, `/r/:slug` for redirects)
- **Validation**: Zod schema validation in route handlers

### Frontend Architecture  
- **Router**: React Router v6 for navigation
- **State**: React Query for API state management
- **Forms**: React Hook Form with Zod resolvers
- **UI**: Tailwind CSS with custom components in `components/ui/`
- **API Client**: Axios-based client in `lib/api.ts`

### Smart Port Management
The project includes automatic port conflict detection:
- Preferred ports: Frontend (3000), Backend (8000), Redirect (8001), DynamoDB (8002, 8003)
- Auto-generates `.env` with available ports if conflicts detected
- Updates all service URLs automatically based on detected ports

### Docker Development
- `docker-compose.yml`: Main development environment
- `docker-compose.override.yml.example`: Template for customizations
- Services: frontend, backend, redirect-server, dynamodb-local, dynamodb-admin

## Testing

```bash
# Backend tests (from backend/)
npm test

# No frontend tests currently configured
```

## Important Notes

- **Type consistency**: Use shared types from `@linkpipe/shared` package
- **Validation**: Always validate with Zod schemas before processing
- **Error handling**: Use custom error classes for consistent API responses  
- **Port conflicts**: Use `npm run dev` for automatic port resolution
- **Environment**: Check generated `.env` file for current port configuration
- **Database**: DynamoDB Local admin UI available at detected port during development