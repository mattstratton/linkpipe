import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import session from 'express-session'
import { prismaDb } from './lib/prisma'
import { linksRouter } from './routes/links'
import { settingsRouter } from './routes/settings'
import { domainsRouter } from './routes/domains'
import { usersRouter } from './routes/users'
import { authRouter } from './routes/auth'
import { errorHandler } from './middleware/errorHandler'
import passport from './middleware/auth'

const app = express()
const port = process.env.PORT || 8000

// Database connection is handled by the singleton in database.ts

// Middleware
app.use(helmet())
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

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LinkPipe API is running',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      links: '/links',
      settings: '/settings',
      health: '/health',
    },
  })
})

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'linkpipe-api',
  })
})

// Public routes (no authentication required)
app.use('/auth', authRouter)

// Protected routes (authentication required)
app.use('/links', linksRouter)
app.use('/settings', settingsRouter)
app.use('/domains', domainsRouter)
app.use('/users', usersRouter)

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server immediately
const server = app.listen(port, () => {
  console.log(`🚀 LinkPipe API server running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🔐 Auth endpoints: http://localhost:${port}/auth`)
  console.log(`🔗 API endpoints: http://localhost:${port}/links`)
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