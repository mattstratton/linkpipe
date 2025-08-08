# LinkPipe Architecture Refactor Plan

## Overview
Consolidate the current three-service architecture into a single Express.js application for simplified deployment and maintenance.

## Current Architecture
- **Frontend**: React/Vite (port 3000)
- **Backend**: Express API (port 8000) 
- **Redirect Service**: Express redirect handler (port 8001)

## Target Architecture
- **Single Express Server** handling:
  - **API Routes**: `/api/*` (links, auth, settings, etc.)
  - **Redirect Routes**: `/*` (short link redirects)
  - **Static Frontend**: Serves the built React app

## Benefits
1. **Simpler Deployment**: One service to deploy and manage
2. **Shared Authentication**: No cross-service auth issues
3. **Better Performance**: No inter-service network calls
4. **Easier Development**: Single codebase, single build process
5. **Cost Effective**: Fewer resources needed

## Implementation Steps

### Phase 1: Backend Consolidation
1. **Merge Redirect Service into Backend**
   - Move redirect logic from `backend/src/redirect-server.ts` to main server
   - Add redirect route handler at root level (`/:slug`)
   - Remove separate redirect service

2. **Update API Routes**
   - Prefix all existing API routes with `/api/`
   - Update route registration in `server.ts`
   - Keep all existing API functionality intact

### Phase 2: Frontend Integration
1. **Update Frontend Build Process**
   - Configure Vite to build to `backend/public/`
   - Update `frontend/vite.config.ts` for production build
   - Add build script to backend package.json

2. **Update Frontend API Calls**
   - Change all API calls to use relative paths (`/api/links` instead of `http://localhost:8000/links`)
   - Remove environment variables for API URLs
   - Update `frontend/src/lib/api.ts` and `frontend/src/contexts/AuthContext.tsx`

3. **Configure Express Static Serving**
   - Add static file serving for React app
   - Configure fallback to `index.html` for client-side routing
   - Handle both API and frontend routes properly

### Phase 3: Docker Simplification
1. **Update Docker Configuration**
   - Remove frontend and redirect-service from `docker-compose.yml`
   - Update backend Dockerfile to include frontend build
   - Simplify to single service + database

2. **Update Environment Variables**
   - Remove cross-service environment variables
   - Consolidate to single `.env` file
   - Update documentation

### Phase 4: Testing & Cleanup
1. **Test All Functionality**
   - Verify API endpoints work with `/api/` prefix
   - Test redirect functionality
   - Test frontend routing and API calls
   - Test authentication flow

2. **Cleanup**
   - Remove unused files and directories
   - Update documentation
   - Remove unused dependencies

## File Changes Required

### Backend Changes
- `backend/src/server.ts` - Add redirect logic and static serving
- `backend/src/routes/*` - Update all route prefixes to `/api/`
- `backend/package.json` - Add frontend build scripts
- `backend/Dockerfile` - Include frontend build process

### Frontend Changes
- `frontend/vite.config.ts` - Update build output directory
- `frontend/src/lib/api.ts` - Update API base URL
- `frontend/src/contexts/AuthContext.tsx` - Update auth API calls
- `frontend/package.json` - Update build scripts

### Docker Changes
- `docker-compose.yml` - Remove frontend and redirect services
- `docker-compose.override.yml.example` - Update for single service
- `.env.example` - Consolidate environment variables

### Documentation Updates
- `README.md` - Update setup and deployment instructions
- `docs/DEPLOYMENT.md` - Simplify deployment process
- Remove references to multiple services

## Route Structure (After Refactor)
```
/                    -> React app (fallback to index.html)
/api/auth/*         -> Authentication endpoints
/api/links/*        -> Link management endpoints
/api/settings/*     -> Settings endpoints
/api/domains/*      -> Domain management endpoints
/api/users/*        -> User management endpoints
/:slug              -> Short link redirects
```

## Migration Strategy
1. **Incremental Approach**: Keep existing services running during development
2. **Feature Parity**: Ensure all functionality works exactly the same
3. **Testing**: Comprehensive testing at each phase
4. **Rollback Plan**: Keep old code until new system is proven stable

## Success Criteria
- [x] Single Express server handles all requests
- [x] All API endpoints work with `/api/` prefix
- [x] Redirect functionality works at root level
- [x] Frontend serves correctly from Express
- [x] Authentication works seamlessly
- [x] Docker deployment simplified to single service
- [x] All existing functionality preserved
- [x] Performance maintained or improved
- [x] Documentation updated for unified architecture
- [x] Dockerfiles renamed and simplified 