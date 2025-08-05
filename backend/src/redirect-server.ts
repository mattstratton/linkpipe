import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { redirectRouter } from './routes/redirect'
import { errorHandler } from './middleware/errorHandler'
import { db } from './lib/database'

const app = express()
const port = process.env.PORT || 8001

// Database connection is handled by the singleton in database.ts

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}))
app.use(cors())
app.use(morgan('combined'))
app.use(express.json())

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'redirect',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// Redirect routes
app.use('/', redirectRouter)

// Catch-all for redirect service
app.use('*', (req, res) => {
  res.status(404).send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Link Not Found - LinkPipe</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 2rem; background: #f9fafb; }
          .container { max-width: 500px; margin: 0 auto; text-align: center; }
          .error { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          h1 { color: #dc2626; margin: 0 0 1rem; }
          p { color: #6b7280; margin: 0; }
          a { color: #2563eb; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="error">
            <h1>Link Not Found</h1>
            <p>The short link you're looking for doesn't exist or has expired.</p>
            <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to LinkPipe</a></p>
          </div>
        </div>
      </body>
    </html>
  `)
})

// Error handler
app.use(errorHandler)

const server = app.listen(port, () => {
  console.log(`🔗 LinkPipe Redirect service running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🔄 Redirect base: http://localhost:${port}`)
  console.log(`🗄️  Database: PostgreSQL`)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  server.close(async () => {
    await db.close()
    console.log('✅ Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  server.close(async () => {
    await db.close()
    console.log('✅ Process terminated')
    process.exit(0)
  })
}) 