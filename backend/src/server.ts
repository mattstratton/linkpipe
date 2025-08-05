import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { prismaDb } from './lib/prisma'
import { linksRouter } from './routes/links'
import { settingsRouter } from './routes/settings'
import { errorHandler } from './middleware/errorHandler'

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

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'LinkPipe API is running',
    version: '1.0.0',
    endpoints: {
      links: '/links',
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

app.use('/links', linksRouter)
app.use('/settings', settingsRouter)

// Error handling middleware (must be last)
app.use(errorHandler)

// Start server immediately
const server = app.listen(port, () => {
  console.log(`🚀 LinkPipe API server running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
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