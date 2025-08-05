# Environment Configuration Guide

This document explains how environment variables are managed in the LinkPipe monorepo.

## 🏗️ Single .env File Approach

LinkPipe uses a **single `.env` file** in the root directory for all services. This approach:

- ✅ **Simplifies configuration** - One place to manage all environment variables
- ✅ **Prevents conflicts** - No duplicate or conflicting configurations
- ✅ **Easier deployment** - Single file to configure for all environments
- ✅ **Better DX** - Developers only need to manage one environment file

## 📁 File Structure

```
linkpipe/
├── .env.example          # Template with all available variables
├── .env                  # Your local environment (gitignored)
├── backend/
│   ├── prisma/
│   │   └── schema.prisma # References DATABASE_URL from root .env
│   └── src/
│       └── lib/
│           └── prisma.ts # Uses DATABASE_URL from root .env
├── frontend/
│   └── src/
│       └── lib/
│           └── api.ts    # Uses VITE_API_URL from root .env
└── docker-compose.yml    # References all variables from root .env
```

## 🔧 Environment Variables

### Local Development

```env
# =============================================================================
# LinkPipe Environment Configuration
# =============================================================================

# Local Development Ports (customize these if you have conflicts)
FRONTEND_PORT=3000
BACKEND_PORT=8000
REDIRECT_PORT=8001
POSTGRES_PORT=5433
PGADMIN_PORT=8003

# Local Development URLs (auto-updated based on ports)
NODE_ENV=development
VITE_API_URL=http://localhost:8000
VITE_REDIRECT_URL=http://localhost:8001

# Database Configuration (PostgreSQL + Prisma)
DATABASE_URL=postgresql://linkpipe:linkpipe@localhost:5433/linkpipe
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=linkpipe
POSTGRES_USER=linkpipe
POSTGRES_PASSWORD=linkpipe

# pgAdmin Configuration (optional database admin UI)
PGADMIN_DEFAULT_EMAIL=admin@linkpipe.local
PGADMIN_DEFAULT_PASSWORD=admin
```

### Production

```env
# Production Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://linkpipe:strong-password@your-db-host:5432/linkpipe

# Frontend URLs
VITE_API_URL=https://api.yourdomain.com
VITE_REDIRECT_URL=https://go.yourdomain.com

# Security
ADMIN_USERNAME=admin
ADMIN_PASSWORD=very-secure-password
```

## 🌐 Domain Management

**Important**: Custom domains are managed in the database settings table, not environment variables.

### Managing Domains via API

```bash
# Get current domains
curl http://localhost:8000/settings/domains

# Update domains
curl -X PUT http://localhost:8000/settings/domains \
  -H "Content-Type: application/json" \
  -d '{
    "value": ["localhost:8001", "short.example.com", "go.example.com"],
    "description": "Available domains for short links"
  }'
```

### Managing Domains via Frontend

1. Go to Settings page in the frontend
2. Update the "domains" setting
3. Save changes

### Default Domains

The application comes with default domains seeded in the database:
- `localhost:8001` (development)
- `short.example.com` (example production domain)

## 🐳 Docker Integration

### Docker Compose Environment

The `docker-compose.yml` file automatically picks up variables from the root `.env` file:

```yaml
services:
  frontend:
    environment:
      - VITE_API_URL=http://localhost:${BACKEND_PORT:-8000}
      - VITE_REDIRECT_URL=http://localhost:${REDIRECT_PORT:-8001}

  backend:
    environment:
      - DATABASE_URL=postgresql://linkpipe:linkpipe@postgres:5432/linkpipe
      - NODE_ENV=development

  postgres:
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-linkpipe}
      - POSTGRES_USER=${POSTGRES_USER:-linkpipe}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-linkpipe}
```

### Container Environment

Each service container receives the appropriate environment variables:

- **Frontend**: Gets `VITE_*` variables for API URLs
- **Backend**: Gets `DATABASE_URL` and database configuration
- **PostgreSQL**: Gets database credentials
- **pgAdmin**: Gets admin credentials

## 🔄 Variable Resolution

### Priority Order

1. **Docker Compose environment** (highest priority)
2. **Root `.env` file**
3. **Default values** in docker-compose.yml

### Example

```yaml
# docker-compose.yml
environment:
  - DATABASE_URL=postgresql://linkpipe:linkpipe@postgres:5432/linkpipe  # Override
  - NODE_ENV=${NODE_ENV:-development}  # Use .env or default
```

## 🚀 Deployment Considerations

### Local Development

1. **Copy template**: `cp .env.example .env`
2. **Customize ports** if needed
3. **Start services**: `docker-compose up -d`

### Production Deployment

1. **Create production .env** with secure values
2. **Use secrets management** for sensitive data
3. **Deploy with environment-specific values**

### Platform-Specific

#### Railway
```bash
# Set environment variables in Railway dashboard
railway variables set DATABASE_URL=postgresql://...
railway variables set NODE_ENV=production
```

#### Vercel
```bash
# Set environment variables in Vercel dashboard
vercel env add VITE_API_URL production
vercel env add VITE_REDIRECT_URL production
```

#### Docker Production
```bash
# Use production .env file
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## 🔒 Security Best Practices

### Development

- ✅ Use `.env.example` as template
- ✅ Keep `.env` in `.gitignore`
- ✅ Use weak passwords for local development
- ✅ Document all required variables

### Production

- ✅ Use strong, unique passwords
- ✅ Rotate credentials regularly
- ✅ Use secrets management services
- ✅ Limit environment variable access
- ✅ Audit environment variables

### Example .gitignore

```gitignore
# Environment files
.env
.env.local
.env.production
.env.staging

# Keep template
!.env.example
```

## 🛠️ Troubleshooting

### Common Issues

1. **Variable not found**
   ```bash
   # Check if variable exists in .env
   grep VARIABLE_NAME .env
   
   # Check Docker Compose environment
   docker-compose config
   ```

2. **Wrong database URL**
   ```bash
   # Verify DATABASE_URL format
   echo $DATABASE_URL
   
   # Test database connection
   docker-compose exec backend npx prisma db push
   ```

3. **Port conflicts**
   ```bash
   # Check what's using the port
   lsof -i :3000
   
   # Change port in .env
   FRONTEND_PORT=4000
   ```

### Debug Commands

```bash
# View all environment variables
docker-compose exec backend env

# Check specific service environment
docker-compose exec frontend printenv VITE_API_URL

# Validate .env file
docker-compose config --quiet
```

## 📋 Migration from Multiple .env Files

If you're migrating from multiple `.env` files:

1. **Consolidate variables** into root `.env`
2. **Update service references** to use root variables
3. **Remove service-specific .env files**
4. **Update documentation** and deployment scripts

### Before (Multiple .env files)
```
linkpipe/
├── .env                  # Root variables
├── backend/.env          # Backend-specific variables
└── frontend/.env         # Frontend-specific variables
```

### After (Single .env file)
```
linkpipe/
├── .env.example          # Template
└── .env                  # All variables
```

## 🎯 Benefits Summary

- **Simplified Management**: One file to rule them all
- **Reduced Conflicts**: No duplicate or conflicting configurations
- **Better DX**: Easier for developers to understand and modify
- **Deployment Friendly**: Single source of truth for all environments
- **Security**: Centralized secrets management
- **Maintainability**: Easier to audit and update configurations

---

This approach ensures a clean, maintainable, and secure environment configuration for the LinkPipe monorepo. 