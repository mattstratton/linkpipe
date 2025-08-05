# Deployment Guide

This guide covers deploying LinkPipe to various platforms and configurations.

## 🌍 Deployment Strategies

### Strategy 1: Docker Production (Recommended)
- **All Services**: Docker containers
- **Database**: PostgreSQL in Docker or managed service
- **Cost**: $5-50/month
- **Scalability**: Good
- **Ease**: High

### Strategy 2: Railway Full Stack
- **Frontend**: Railway static hosting
- **Backend**: Railway Node.js service
- **Database**: Railway PostgreSQL
- **Cost**: $5-20/month
- **Scalability**: Excellent
- **Ease**: Very High

### Strategy 3: Vercel + Railway Hybrid
- **Frontend**: Vercel
- **Backend**: Railway Node.js service
- **Database**: Railway PostgreSQL
- **Cost**: $0-20/month
- **Scalability**: Excellent
- **Ease**: High

### Strategy 4: VPS/Docker
- **All Services**: Docker on VPS
- **Database**: PostgreSQL in Docker
- **Cost**: $5-20/month
- **Scalability**: Manual
- **Control**: High

## 🐳 Docker Production Deployment

### Prerequisites
- Docker and Docker Compose installed
- Domain name (optional)
- SSL certificate (optional)

### Step 1: Create Production Docker Compose

Create `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  frontend:
    build:
      context: .
      dockerfile: frontend/Dockerfile.prod
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=https://api.yourdomain.com
      - VITE_REDIRECT_URL=https://go.yourdomain.com
    depends_on:
      - backend

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.prod
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://linkpipe:linkpipe@postgres:5432/linkpipe
    depends_on:
      - postgres
    volumes:
      - ./backend/data:/app/data

  redirect-service:
    build:
      context: .
      dockerfile: backend/Dockerfile.redirect.prod
    ports:
      - "8001:8001"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://linkpipe:linkpipe@postgres:5432/linkpipe
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=linkpipe
      - POSTGRES_USER=linkpipe
      - POSTGRES_PASSWORD=your-secure-password
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - redirect-service

volumes:
  postgres-data:
```

### Step 2: Create Production Dockerfiles

`frontend/Dockerfile.prod`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY frontend/package*.json ./frontend/
RUN npm install --ignore-scripts

COPY shared/ ./shared/
COPY frontend/ ./frontend/
WORKDIR /app/frontend
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`backend/Dockerfile.prod`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
RUN npm install --ignore-scripts

COPY shared/ ./shared/
COPY backend/ ./backend/
WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

EXPOSE 8000
CMD ["node", "dist/server.js"]
```

`backend/Dockerfile.redirect.prod`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY backend/package*.json ./backend/
RUN npm install --ignore-scripts

COPY shared/ ./shared/
COPY backend/ ./backend/
WORKDIR /app/backend

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

EXPOSE 8001
CMD ["node", "dist/redirect-server.js"]
```

### Step 3: Create Nginx Configuration

`nginx.conf`:
```nginx
events {
    worker_connections 1024;
}

http {
    upstream frontend {
        server frontend:80;
    }

    upstream backend {
        server backend:8000;
    }

    upstream redirect {
        server redirect-service:8001;
    }

    server {
        listen 80;
        server_name yourdomain.com www.yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com www.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # API
        location /api/ {
            proxy_pass http://backend/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }

    server {
        listen 443 ssl;
        server_name go.yourdomain.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        # Redirect service
        location / {
            proxy_pass http://redirect;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
```

### Step 4: Deploy

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy

# Seed database (optional)
docker-compose -f docker-compose.prod.yml exec backend npm run db:seed
```

## 🚂 Railway Full Stack Deployment

### Step 1: Deploy Backend

1. **Connect to Railway**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login to Railway
   railway login
   ```

2. **Deploy Backend Service**
   ```bash
   cd backend
   railway init
   railway up
   ```

3. **Configure Environment Variables**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=postgresql://...
   ```

4. **Deploy Database**
   ```bash
   # Create PostgreSQL service in Railway dashboard
   # Or use Railway CLI
   railway service create postgres
   ```

### Step 2: Deploy Frontend

1. **Deploy to Railway Static**
   ```bash
   cd frontend
   railway init
   railway up
   ```

2. **Configure Environment**
   ```bash
   railway variables set VITE_API_URL=https://your-backend-url.railway.app
   railway variables set VITE_REDIRECT_URL=https://your-redirect-url.railway.app
   ```

## 🔷 Vercel + Railway Hybrid Deployment

### Step 1: Deploy Backend to Railway
Follow Railway deployment steps above.

### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure Environment**
   ```bash
   cd frontend
   cp .env.example .env.production
   # Update VITE_API_URL with your Railway backend URL
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Environment Variables in Vercel**
   ```bash
   vercel env add VITE_API_URL production
   vercel env add VITE_REDIRECT_URL production
   ```

### Custom Domain on Vercel
```bash
vercel domains add yourdomain.com
vercel domains add go.yourdomain.com  # for redirects
```

## 🌐 Custom Domain Setup

### Cloudflare (Recommended)

1. **Add Domain to Cloudflare**
2. **Update Nameservers**
3. **Configure DNS Records**
   ```
   A     @           your-server-ip
   CNAME www         yourdomain.com
   CNAME go          yourdomain.com
   CNAME api         your-backend-url
   ```

### AWS Route 53

1. **Create Hosted Zone**
   ```bash
   aws route53 create-hosted-zone \
     --name yourdomain.com \
     --caller-reference $(date +%s)
   ```

2. **Request SSL Certificate**
   ```bash
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --subject-alternative-names "*.yourdomain.com" \
     --validation-method DNS
   ```

## 📊 Database Management

### Prisma Migrations

```bash
# Generate migration
cd backend
npx prisma migrate dev --name add_new_feature

# Deploy migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset

# Seed database
npm run db:seed
```

### Database Backups

```bash
# Backup PostgreSQL
docker-compose exec postgres pg_dump -U linkpipe linkpipe > backup.sql

# Restore PostgreSQL
docker-compose exec -T postgres psql -U linkpipe linkpipe < backup.sql
```

## 🔒 Security Considerations

### Environment Variables
- Use strong passwords for PostgreSQL
- Keep `.env` files out of version control
- Use secrets management in production

### SSL/TLS
- Always use HTTPS in production
- Configure proper SSL certificates
- Set up automatic certificate renewal

### Database Security
- Use strong database passwords
- Restrict database access to application only
- Regular security updates

### Example Production .env
```env
# Production Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://linkpipe:strong-password@localhost:5432/linkpipe

# Frontend URLs
VITE_API_URL=https://api.yourdomain.com
VITE_REDIRECT_URL=https://go.yourdomain.com

# Security
ADMIN_USERNAME=admin
ADMIN_PASSWORD=very-secure-password
```

## 🚀 CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:
```yaml
name: Deploy LinkPipe

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend
          npm install
      - name: Build
        run: |
          cd backend
          npm run build
      - name: Deploy to Railway
        run: |
          cd backend
          railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install and build
        run: |
          cd frontend
          npm install
          npm run build
      - name: Deploy to Vercel
        run: |
          cd frontend
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## 🔧 Troubleshooting Deployment Issues

### Common Problems

1. **Database Connection Issues**
   - Check DATABASE_URL format
   - Verify database is running
   - Check network connectivity

2. **Prisma Migration Issues**
   - Run `npx prisma migrate deploy`
   - Check database permissions
   - Verify schema compatibility

3. **CORS Issues**
   - Configure proper origins in backend
   - Check frontend API URLs
   - Verify SSL certificates

4. **Port Conflicts**
   - Check if ports are already in use
   - Update port configuration
   - Restart services

### Debug Commands

```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f

# Check database connection
docker-compose exec backend npx prisma db push

# Test API endpoints
curl -X GET https://api.yourdomain.com/health

# Check SSL certificate
openssl s_client -connect yourdomain.com:443
```

### Performance Optimization

1. **Database Optimization**
   - Add database indexes
   - Optimize queries
   - Use connection pooling

2. **Application Optimization**
   - Enable compression
   - Use CDN for static assets
   - Implement caching

3. **Infrastructure Optimization**
   - Use load balancers
   - Scale horizontally
   - Monitor resource usage

---

This deployment guide should help you get LinkPipe running in any environment. Choose the strategy that best fits your needs, budget, and technical requirements! 