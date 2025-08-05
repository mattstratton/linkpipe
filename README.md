# LinkPipe - URL Shortener with UTM Manager

![LinkPipe Logo](https://via.placeholder.com/150x50/3b82f6/ffffff?text=LinkPipe)

A professional URL shortener with UTM parameter management, built with a modern stack using PostgreSQL, Prisma, and Docker for easy deployment and development.

## ✨ Features

- 🔗 **URL Shortening** - Create short, memorable links with custom or auto-generated slugs
- 📊 **UTM Management** - Add, manage, and track UTM parameters with predefined options
- 🌐 **Multi-Domain Support** - Support for multiple custom domains for redirection
- 🎯 **Click Tracking** - Track clicks and analytics for each short link
- 🗄️ **Modern Database** - PostgreSQL with Prisma ORM for type safety and migrations
- 🎨 **Modern UI** - React + Tailwind CSS with responsive design
- 🐳 **Docker Ready** - Complete Docker setup for easy development and deployment
- 🔄 **Flexible Deployment** - Deploy to any platform that supports Docker

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   Express API   │    │  PostgreSQL DB  │
│   (Vite + TS)   │───▶│   + Prisma      │───▶│   + pgAdmin     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│  Short URL      │    │ Redirect Service │             │
│  (go.domain.com)│───▶│   Express       │─────────────┘
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Local Development

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd linkpipe
   ```

2. **Start with Docker Compose** ⭐ *Recommended*
   ```bash
   # Copy environment template
   cp .env.example .env
   
   # Start all services
   docker-compose up -d
   ```
   
   This will start:
   - **Frontend**: http://localhost:3000
   - **API**: http://localhost:8000
   - **Redirect Service**: http://localhost:8001
   - **PostgreSQL**: localhost:5433
   - **pgAdmin**: http://localhost:8003

3. **Initialize Database**
   ```bash
   # Run Prisma migrations
   cd backend
   npx prisma migrate dev
   
   # Seed with sample data
   npm run db:seed
   ```

4. **Access the Application**
   - **Frontend**: http://localhost:3000
   - **API Health**: http://localhost:8000/health
   - **pgAdmin**: http://localhost:8003 (admin@linkpipe.local / admin)

## 📁 Project Structure

```
linkpipe/
├── frontend/              # React + Vite frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Route pages
│   │   ├── lib/           # API client and utilities
│   │   └── App.tsx        # Main app component
│   ├── Dockerfile.dev     # Development Docker config
│   └── vercel.json        # Vercel deployment config
├── backend/               # Node.js API with Express + Prisma
│   ├── src/
│   │   ├── routes/        # Express routes
│   │   ├── lib/           # Prisma database layer
│   │   ├── middleware/    # Express middleware
│   │   └── types.ts       # TypeScript types
│   ├── prisma/            # Prisma schema and migrations
│   │   ├── schema.prisma  # Database schema
│   │   └── migrations/    # Database migrations
│   └── sql/               # SQL initialization scripts
├── shared/                # Shared TypeScript types and utilities
│   └── src/
│       ├── types.ts       # Common types and Zod schemas
│       └── utils.ts       # Shared utility functions
├── docker-compose.yml     # Local development environment
├── .env.example           # Environment variables template
└── package.json           # Workspace configuration
```

## 🛡️ Environment Configuration

### Single .env File Approach

LinkPipe uses a single `.env` file in the root directory for all services:

```env
# Local Development Ports
FRONTEND_PORT=3000
BACKEND_PORT=8000
REDIRECT_PORT=8001
POSTGRES_PORT=5433
PGADMIN_PORT=8003

# Database Configuration (PostgreSQL + Prisma)
DATABASE_URL=postgresql://linkpipe:linkpipe@localhost:5433/linkpipe
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=linkpipe
POSTGRES_USER=linkpipe
POSTGRES_PASSWORD=linkpipe

# Local Development URLs
NODE_ENV=development
VITE_API_URL=http://localhost:8000
VITE_REDIRECT_URL=http://localhost:8001
```

### Port Configuration

All ports are configurable via environment variables. If you have conflicts:

```bash
# Edit .env file
FRONTEND_PORT=4000
BACKEND_PORT=9000
REDIRECT_PORT=9001
POSTGRES_PORT=5434
PGADMIN_PORT=9003
```

## 🌍 Deployment Options

### Option 1: Docker Production

```bash
# Build and run production containers
docker-compose -f docker-compose.prod.yml up -d --build
```

### Option 2: Vercel Frontend + Railway Backend

1. **Deploy Backend to Railway**
   ```bash
   cd backend
   # Connect to Railway and deploy
   ```

2. **Deploy Frontend to Vercel**
   ```bash
   cd frontend
   # Update VITE_API_URL in vercel.json
   vercel --prod
   ```

### Option 3: Full VPS Deployment

```bash
# Clone and setup on your VPS
git clone <repository-url>
cd linkpipe
cp .env.example .env
# Edit .env with production values
docker-compose up -d
```

## ⚙️ Configuration

### Database Schema

The application uses Prisma with PostgreSQL:

```sql
-- Links table
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(50) UNIQUE NOT NULL,
  url TEXT NOT NULL,
  domain VARCHAR(255) DEFAULT 'localhost:8001',
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  description TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT true,
  click_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(255) UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Prisma Management

```bash
# Generate Prisma client
cd backend
npx prisma generate

# Run migrations
npx prisma migrate dev

# Reset database
npx prisma migrate reset

# Seed database
npm run db:seed

# Open Prisma Studio
npx prisma studio
```

## 🔧 Development

### Adding New Features

1. **Update Database Schema** in `backend/prisma/schema.prisma`
2. **Create Migration** with `npx prisma migrate dev`
3. **Update API** in `backend/src/routes/`
4. **Update Frontend** in `frontend/src/`
5. **Update Types** in `shared/src/types.ts`

### Development Commands

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build

# Stop all services
docker-compose down

# Clean everything
docker-compose down -v
```

### Testing

```bash
# Run backend tests
cd backend && npm test

# Run frontend tests  
cd frontend && npm test

# Run all tests
npm test
```

### Linting

```bash
# Lint all packages
npm run lint

# Fix linting issues
npm run lint:fix
```

## 📊 API Endpoints

### Links Management

```
POST   /links           # Create short link
GET    /links           # List all links
GET    /links/:slug     # Get specific link
PUT    /links/:slug     # Update link
DELETE /links/:slug     # Delete link
HEAD   /links/:slug     # Check if slug exists
```

### Settings Management

```
GET    /settings        # Get all settings
GET    /settings/:key   # Get specific setting
PUT    /settings/:key   # Update setting
PUT    /settings        # Update multiple settings
```

### Redirection

```
GET    /:slug           # Redirect to target URL (increment click count)
```

### Example API Usage

```javascript
// Create a short link
const response = await fetch('/api/links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: 'https://example.com',
    slug: 'my-link', // Optional
    domain: 'short.example.com', // Optional
    utm_params: {
      utm_source: 'newsletter',
      utm_medium: 'email'
    },
    tags: ['marketing'],
    description: 'Marketing campaign link'
  })
});

// Get all links
const links = await fetch('/api/links').then(r => r.json());

// Redirect (increments click count)
window.location.href = 'http://localhost:8001/example';
```

## 💰 Cost Estimates

| Component       | Service                  | Est. Monthly Cost |
|----------------|--------------------------|-------------------|
| Frontend        | Vercel/Netlify           | $0-20             |
| Backend         | Railway/Render/Railway   | $5-20             |
| Database        | PostgreSQL (Railway/PlanetScale) | $5-20        |
| Domain & DNS    | Cloudflare/Route 53      | $0-15             |

**Total: $10-75/month** depending on usage and platform

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :3000
   lsof -i :8000
   lsof -i :8001
   
   # Change ports in .env file
   FRONTEND_PORT=4000
   BACKEND_PORT=9000
   REDIRECT_PORT=9001
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL is running
   docker-compose ps postgres
   
   # Restart PostgreSQL
   docker-compose restart postgres
   
   # Check logs
   docker-compose logs postgres
   ```

3. **Prisma Issues**
   ```bash
   # Regenerate Prisma client
   cd backend
   npx prisma generate
   
   # Reset database
   npx prisma migrate reset
   
   # Check database connection
   npx prisma db push --preview-feature
   ```

4. **Build Issues**
   ```bash
   # Clean and rebuild
   docker-compose down
   docker-compose up -d --build
   
   # Check logs
   docker-compose logs -f
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=linkpipe:* docker-compose up

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to the branch: `git push origin feature/new-feature`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with React, Node.js, PostgreSQL, and Prisma
- UI components inspired by shadcn/ui
- Icons by Lucide React
- Database management with Prisma ORM
- Containerized with Docker

---

**LinkPipe** - Making URL management simple and powerful! 🚀

### 🎯 Getting Started Summary

```bash
# Quick start - just run this!
git clone <repository-url>
cd linkpipe
cp .env.example .env
docker-compose up -d

# Your services will be available at:
# Frontend: http://localhost:3000
# API: http://localhost:8000
# Redirect: http://localhost:8001
# pgAdmin: http://localhost:8003
```