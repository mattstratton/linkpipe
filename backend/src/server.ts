import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import session from 'express-session'
import path from 'path'
import { prismaDb } from './lib/prisma'
import { linksRouter } from './routes/links'
import { settingsRouter } from './routes/settings'
import { domainsRouter } from './routes/domains'
import { usersRouter } from './routes/users'
import { authRouter } from './routes/auth'
import { redirectRouter } from './routes/redirect'
import { errorHandler } from './middleware/errorHandler'
import passport from './middleware/auth'

const app = express()
const port = process.env.PORT || 8000

// Database connection is handled by the singleton in database.ts

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  originAgentCluster: false,
  strictTransportSecurity: false,
}))
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    process.env.FRONTEND_URL?.replace('3000', '3003') || 'http://localhost:3003',
    'http://localhost:3000',
    'http://localhost:3003',
  ],
  credentials: true,
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}))

// Initialize Passport
app.use(passport.initialize())
app.use(passport.session())

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'linkpipe-unified',
  })
})

// Serve static files from the React app build directory
// This will be configured when we build the frontend
if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
  app.use(express.static(path.join(__dirname, '../public')))
}

// API Routes (prefixed with /api)
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'LinkPipe API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      links: '/api/links',
      settings: '/api/settings',
      domains: '/api/domains',
      users: '/api/users',
      health: '/health',
    },
  })
})

// Public API routes (no authentication required)
app.use('/api/auth', authRouter)

// Protected API routes (authentication required)
app.use('/api/links', linksRouter)
app.use('/api/settings', settingsRouter)
app.use('/api/domains', domainsRouter)
app.use('/api/users', usersRouter)

// Redirect routes (handle short links at root level)
app.use('/', redirectRouter)

// Handle React routing, return all requests to React app (after redirect routes)
if (process.env.NODE_ENV === 'production' || process.env.SERVE_STATIC === 'true') {
  app.get('*', (req, res, next) => {
    // Skip API routes and health check
    if (req.path.startsWith('/api/') || req.path === '/health') {
      return next();
    }
    
    // For all other routes, serve the React app
    res.sendFile(path.join(__dirname, '../public/index.html'))
  })
}

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server immediately
const server = app.listen(port, () => {
  console.log(`🚀 LinkPipe Unified server running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🔐 Auth endpoints: http://localhost:${port}/api/auth`)
  console.log(`🔗 API endpoints: http://localhost:${port}/api/links`)
  console.log(`🔄 Redirect base: http://localhost:${port}`)
  console.log(`🗄️  Database: PostgreSQL`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  server.close(async () => {
    await prismaDb.close()
    console.log('✅ Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  server.close(async () => {
    await prismaDb.close()
    console.log('✅ Process terminated')
    process.exit(0)
  })
}) 