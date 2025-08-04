import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { redirectRouter, setDocClient } from './routes/redirect'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const port = process.env.PORT || 8001

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

app.listen(port, () => {
  console.log(`🔗 LinkPipe Redirect service running on port ${port}`)
  console.log(`📊 Health check: http://localhost:${port}/health`)
  console.log(`🔄 Redirect base: http://localhost:${port}`)
}) 