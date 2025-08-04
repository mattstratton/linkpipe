# LinkPipe - URL Shortener with UTM Manager

![LinkPipe Logo](https://via.placeholder.com/150x50/3b82f6/ffffff?text=LinkPipe)

A professional URL shortener with UTM parameter management, built with a serverless-first architecture that can run locally with Docker or deploy to AWS/Vercel.

## ✨ Features

- 🔗 **URL Shortening** - Create short, memorable links with custom or auto-generated slugs
- 📊 **UTM Management** - Add, manage, and track UTM parameters with predefined options
- 🌐 **Multi-Domain Support** - Support for multiple custom domains for redirection
- 🚀 **Serverless Architecture** - AWS Lambda + DynamoDB for production, Docker for local dev
- 💰 **Cost-Effective** - Designed to run under $1/month on AWS
- 🎨 **Modern UI** - React + Tailwind CSS with responsive design
- 🔄 **Flexible Deployment** - Deploy frontend to Vercel, S3+CloudFront, or Amplify
- 🛡️ **Smart Port Management** - Automatic port conflict detection and resolution

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Frontend │    │   API Gateway   │    │  Lambda Functions│
│   (Vite + TS)   │───▶│     + CORS      │───▶│   + DynamoDB    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
┌─────────────────┐    ┌─────────────────┐             │
│  Short URL      │    │ Redirect Service │             │
│  (go.domain.com)│───▶│ Lambda@Edge/S3  │─────────────┘
└─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local development)
- AWS CLI (for AWS deployment)
- Vercel CLI (optional, for Vercel deployment)

### Local Development

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd linkpipe
   ```

2. **Start with Smart Port Detection** ⭐ *Recommended*
   ```bash
   npm run dev
   ```
   
   This will:
   - 🔍 Automatically detect available ports
   - ⚙️ Generate `.env` file with conflict-free ports
   - 🐳 Start all services with Docker Compose
   - 📋 Display service URLs

   **Example Output:**
   ```
   🔍 Finding available ports...
   ✅ FRONTEND_PORT: 3000 (preferred)
   ⚠️  BACKEND_PORT: 8080 (8000 was busy)
   ✅ REDIRECT_PORT: 8001 (preferred)
   
   📋 Your services will be available at:
      Frontend:       http://localhost:3000
      API:            http://localhost:8080
      Redirect:       http://localhost:8001
      DynamoDB:       http://localhost:8002
      DynamoDB Admin: http://localhost:8003
   ```

3. **Alternative Development Options**
   ```bash
   # Interactive start (asks about port conflicts)
   npm run dev:auto        # Linux/Mac
   npm run dev:win         # Windows
   
   # Force start with existing .env (skip port detection)
   npm run dev:force
   
   # Just detect ports without starting
   npm run dev:ports
   
   # Clean everything and start fresh
   npm run dev:clean
   
   # Manual development (separate terminals)
   npm run dev:frontend
   npm run dev:backend
   ```

4. **Custom Port Configuration**
   
   Edit `.env` to use specific ports:
   ```env
   FRONTEND_PORT=4000
   BACKEND_PORT=9000
   REDIRECT_PORT=9001
   DYNAMODB_PORT=9002
   DYNAMODB_ADMIN_PORT=9003
   ```

5. **Advanced Customization**
   
   Copy `docker-compose.override.yml.example` to `docker-compose.override.yml` for permanent customizations:
   ```bash
   cp docker-compose.override.yml.example docker-compose.override.yml
   # Edit the file to customize your setup
   ```

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
├── backend/               # Node.js API (Express for dev, Lambda for prod)
│   ├── src/
│   │   ├── lambda/        # AWS Lambda functions
│   │   ├── routes/        # Express routes (for local dev)
│   │   ├── lib/           # Shared utilities and DynamoDB setup
│   │   └── middleware/    # Express middleware
│   ├── infrastructure/    # CloudFormation/CDK templates
│   └── serverless.yml     # Serverless framework config
├── shared/                # Shared TypeScript types and utilities
│   └── src/
│       ├── types.ts       # Common types and Zod schemas
│       └── utils.ts       # Shared utility functions
├── scripts/               # Development and deployment scripts
│   ├── find-ports.js      # Smart port detection
│   ├── start-dev.sh       # Linux/Mac development script
│   └── start-dev.bat      # Windows development script
├── docker-compose.yml     # Local development environment
├── .env.example           # Environment variables template
└── package.json           # Workspace configuration
```

## 🛡️ Smart Port Management

LinkPipe includes intelligent port conflict resolution to handle busy development environments:

### **Automatic Port Detection**
- ✅ **Tries preferred ports first** (3000, 8000, 8001, etc.)
- 🔍 **Scans for alternatives** if conflicts exist
- ⚙️ **Updates all service URLs** automatically
- 📝 **Generates `.env` file** with available ports

### **Development Scripts**
| Command | Description |
|---------|-------------|
| `npm run dev` | 🎯 Auto-detect ports and start (recommended) |
| `npm run dev:auto` | 🛡️ Interactive script with conflict checks |
| `npm run dev:force` | ⚡ Skip port detection, use existing .env |
| `npm run dev:ports` | 🔍 Just find and set available ports |
| `npm run dev:clean` | 🧹 Clean containers and start fresh |

### **Port Configuration**
All ports are configurable via environment variables:
```env
# Default ports (automatically adjusted if busy)
FRONTEND_PORT=3000          # React development server
BACKEND_PORT=8000           # API server
REDIRECT_PORT=8001          # Redirect service
DYNAMODB_PORT=8002          # DynamoDB Local
DYNAMODB_ADMIN_PORT=8003    # DynamoDB Admin UI
```

## 🌍 Deployment Options

### Option 1: AWS Serverless (Production)

1. **Configure AWS Credentials**
   ```bash
   aws configure
   ```

2. **Deploy Backend**
   ```bash
   cd backend
   npm run deploy:aws
   ```

3. **Deploy Frontend to S3 + CloudFront**
   ```bash
   cd frontend
   # Update vercel.json with your API Gateway URL
   npm run build
   # Deploy to S3 bucket and configure CloudFront
   ```

### Option 2: Vercel Frontend + AWS Backend

1. **Deploy Backend to AWS** (same as above)

2. **Deploy Frontend to Vercel**
   ```bash
   cd frontend
   # Install Vercel CLI if not already installed
   npm install -g vercel
   
   # Update vercel.json with your API Gateway URL
   npm run deploy
   ```

### Option 3: Full Docker Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml up --build -d
```

## ⚙️ Configuration

### Environment Variables

The system automatically generates a `.env` file, but you can customize it:

```env
# Local Development Ports (auto-detected or manually set)
FRONTEND_PORT=3000
BACKEND_PORT=8000
REDIRECT_PORT=8001
DYNAMODB_PORT=8002
DYNAMODB_ADMIN_PORT=8003

# Local Development URLs (auto-updated based on ports)
NODE_ENV=development
VITE_API_URL=http://localhost:8000
VITE_REDIRECT_URL=http://localhost:8001

# AWS Production
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id
DYNAMODB_TABLE_NAME=linkpipe-urls
API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com

# Custom Domains
PRIMARY_DOMAIN=yourdomain.com
REDIRECT_DOMAINS=short.yourdomain.com,go.yourdomain.com

# Optional: Basic Auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
```

### DynamoDB Schema

The application creates these tables automatically:

```javascript
// linkpipe-urls table
{
  slug: "abc123",              // Partition Key
  url: "https://example.com",
  utm_params: {
    utm_source: "newsletter",
    utm_medium: "email"
  },
  createdAt: "2025-01-01T12:00:00Z",
  updatedAt: "2025-01-01T12:00:00Z",
  tags: ["campaign1"],
  expiresAt: "2025-12-31T23:59:59Z", // Optional
  description: "Marketing campaign link",
  isActive: true
}
```

## 🔧 Development

### Adding New Features

1. **Add Types** in `shared/src/types.ts`
2. **Update API** in `backend/src/routes/`
3. **Update Frontend** in `frontend/src/`

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

### Redirection

```
GET    /r/:slug         # Redirect to target URL
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
    utm_params: {
      utm_source: 'newsletter',
      utm_medium: 'email'
    },
    tags: ['marketing'],
    description: 'Marketing campaign link'
  })
});
```

## 💰 Cost Estimates

| Component       | Service                  | Est. Monthly Cost |
|----------------|--------------------------|-------------------|
| Frontend        | Vercel/S3+CloudFront     | $0-5              |
| Backend         | Lambda + API Gateway     | $0-1              |
| Database        | DynamoDB                 | $0-1              |
| Domain & DNS    | Route 53                 | $0.50             |

**Total: Under $10/month** for moderate usage

## 🛠️ Troubleshooting

### Common Issues

1. **Port Conflicts**
   ```bash
   # Automatic resolution
   npm run dev
   
   # Manual port detection
   npm run dev:ports
   
   # Clean and restart
   npm run dev:clean
   ```

2. **DynamoDB Connection Issues**
   ```bash
   # Check DynamoDB Local is running
   docker ps | grep dynamodb-local
   
   # Restart DynamoDB Local
   docker-compose restart dynamodb-local
   ```

3. **CORS Issues**
   - The system automatically updates API URLs based on detected ports
   - Check generated `.env` file for correct URLs
   - Verify backend CORS configuration
   - Ensure API Gateway has CORS enabled (production)

4. **Build Issues**
   ```bash
   # Clean and rebuild
   npm run clean
   npm install
   npm run build
   ```

5. **Docker Issues**
   ```bash
   # Clean everything
   npm run dev:clean
   
   # Check Docker status
   docker ps
   docker-compose logs
   ```

### Debug Mode

```bash
# Enable debug logging
DEBUG=linkpipe:* npm run dev

# View specific service logs
docker-compose logs frontend
docker-compose logs backend
```

### Port Management Debug

```bash
# Check what ports are being used
npm run dev:ports

# View current .env configuration
cat .env

# Test specific port availability
node -e "
const net = require('net');
const server = net.createServer();
server.listen(3000, () => {
  console.log('Port 3000 is available');
  server.close();
});
server.on('error', () => console.log('Port 3000 is busy'));
"
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

- Built with React, Node.js, AWS Lambda, and DynamoDB
- UI components inspired by shadcn/ui
- Icons by Lucide React
- Hosted on AWS and Vercel
- Smart port management for developer experience

---

**LinkPipe** - Making URL management simple and powerful! 🚀

### 🎯 Getting Started Summary

```bash
# Quick start - just run this!
npm run dev

# Your services will automatically start on available ports
# No more port conflicts! 🎉
```