import { Router, Request, Response } from 'express';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ShortLink } from '../types';
import { appendUtmParams, isExpired, isValidSlug } from '../utils';
import { getTableName } from '../lib/dynamodb';

// This will be imported from the redirect server file
let docClient: DynamoDBDocumentClient;

// Initialize the router
export const redirectRouter = Router();

// Set the DynamoDB client (called from redirect-server.ts)
export function setDocClient(client: DynamoDBDocumentClient) {
  docClient = client;
}

// GET /:slug - Redirect to the target URL
redirectRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    // Validate slug format
    if (!isValidSlug(slug)) {
      return res.status(400).send(createErrorPage(
        'Invalid Link Format',
        'The requested link format is invalid.',
        400
      ));
    }
    
    // Fetch the link from DynamoDB
    const tableName = getTableName();
    const command = new GetCommand({
      TableName: tableName,
      Key: { slug }
    });
    
    const result = await docClient.send(command);
    
    if (!result.Item) {
      return res.status(404).send(createErrorPage(
        'Link Not Found',
        'The requested short link does not exist or has been removed.',
        404
      ));
    }
    
    const link = result.Item as ShortLink;
    
    // Check if link is active
    if (!link.isActive) {
      return res.status(410).send(createErrorPage(
        'Link Disabled',
        'This short link has been disabled by the administrator.',
        410
      ));
    }
    
    // Check if link has expired
    if (link.expiresAt && isExpired(link.expiresAt)) {
      return res.status(410).send(createErrorPage(
        'Link Expired',
        'This short link has expired and is no longer available.',
        410
      ));
    }
    
    // Build the final URL with UTM parameters
    const finalUrl = appendUtmParams(link.url, link.utm_params);
    
    // TODO: In the future, we could track click analytics here
    // await trackClick(slug, req);
    
    // Perform the redirect
    res.redirect(302, finalUrl);
    
  } catch (error) {
    console.error('Error during redirect:', error);
    res.status(500).send(createErrorPage(
      'Server Error',
      'An unexpected error occurred while processing your request.',
      500
    ));
  }
});

// Helper function to create error pages
function createErrorPage(title: string, message: string, statusCode: number): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - LinkPipe</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      margin: 0;
      padding: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .container {
      background: white;
      border-radius: 12px;
      padding: 2rem;
      margin: 1rem;
      max-width: 500px;
      text-align: center;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    
    .error-code {
      font-size: 4rem;
      font-weight: bold;
      color: #e53e3e;
      margin: 0;
      line-height: 1;
    }
    
    .error-title {
      font-size: 1.5rem;
      font-weight: 600;
      color: #2d3748;
      margin: 1rem 0 0.5rem 0;
    }
    
    .error-message {
      color: #4a5568;
      margin: 0 0 2rem 0;
      line-height: 1.6;
    }
    
    .home-link {
      display: inline-block;
      background: #667eea;
      color: white;
      text-decoration: none;
      padding: 0.75rem 1.5rem;
      border-radius: 6px;
      font-weight: 500;
      transition: background-color 0.2s;
    }
    
    .home-link:hover {
      background: #5a67d8;
    }
    
    .logo {
      color: #667eea;
      font-size: 1.25rem;
      font-weight: bold;
      margin-bottom: 1rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">🔗 LinkPipe</div>
    <div class="error-code">${statusCode}</div>
    <h1 class="error-title">${title}</h1>
    <p class="error-message">${message}</p>
    <a href="/" class="home-link">← Go Home</a>
  </div>
</body>
</html>
  `.trim();
}

// GET /health - Health check endpoint
redirectRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'linkpipe-redirect'
  });
});

// Catch-all for any other routes
redirectRouter.get('*', (req: Request, res: Response) => {
  res.status(404).send(createErrorPage(
    'Page Not Found',
    'The page you are looking for does not exist.',
    404
  ));
}); 