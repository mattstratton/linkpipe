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

// DynamoDB setup
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
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
    convertEmptyValues: true,
  },
})

// Set the DynamoDB client for routes
setDocClient(docClient)

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
}))
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173']
    : true,
  credentials: true,
}))
app.use(morgan('combined'))
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  })
})

// API routes
app.use('/links', linksRouter)

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  })
})

// Error handler
app.use(errorHandler)

// Initialize tables and start server
async function startServer() {
  try {
    console.log('🔧 Initializing DynamoDB tables...')
    await createTables(dynamoClient)
    
    app.listen(port, () => {
      console.log(`🚀 LinkPipe API server running on port ${port}`)
      console.log(`📊 Health check: http://localhost:${port}/health`)
      console.log(`🔗 API base: http://localhost:${port}`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully')
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully')
  process.exit(0)
})

startServer() 