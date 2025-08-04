import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { createTables } from './lib/dynamodb'
import { linksRouter, setDocClient } from './routes/links'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const port = process.env.PORT || 8000

// DynamoDB setup with proper timeouts
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  requestHandler: {
    requestTimeout: 5000, // 5 second timeout
    httpsAgent: undefined,
  },
  ...(process.env.DYNAMODB_ENDPOINT && {
    endpoint: process.env.DYNAMODB_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'dummy',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'dummy',
    },
  }),
})

const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
})

// Set up the document client for routes
setDocClient(docClient)

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

// Error handling middleware (must be last)
app.use(errorHandler)

// Initialize DynamoDB tables in background (non-blocking)
async function initializeDynamoDB() {
  try {
    console.log('🔧 Initializing DynamoDB tables...')
    await createTables(dynamoClient)
    console.log('✅ DynamoDB initialization complete')
  } catch (error) {
    console.error('❌ DynamoDB initialization failed:', error)
    console.warn('⚠️ API will still work, but database operations may fail')
  }
}

// Start server immediately
const server = app.listen(port, () => {
  console.log(`🚀 LinkPipe API server running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🔗 API endpoints: http://localhost:${port}/links`)
  
  // Initialize DynamoDB in background after server starts
  initializeDynamoDB()
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Process terminated')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  server.close(() => {
    console.log('✅ Process terminated')
    process.exit(0)
  })
}) 