import { Router, Request, Response } from 'express';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import { ShortLink, appendUtmParams, isExpired, isValidSlug } from '@linkpipe/shared';
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
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invalid Link - LinkPipe</title>
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
                <h1>Invalid Link</h1>
                <p>The link format is invalid.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to LinkPipe</a></p>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    // Fetch the link from DynamoDB
    const result = await docClient.send(new GetCommand({
      TableName: getTableName(),
      Key: { slug },
    }));

    if (!result.Item) {
      // Link not found
      return res.status(404).send(`
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
                <p>The short link you're looking for doesn't exist.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to LinkPipe</a></p>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    const link = result.Item as ShortLink;

    // Check if link is active
    if (!link.isActive) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Link Disabled - LinkPipe</title>
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
                <h1>Link Disabled</h1>
                <p>This short link has been disabled.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to LinkPipe</a></p>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    // Check if link has expired
    if (link.expiresAt && isExpired(link.expiresAt)) {
      return res.status(410).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Link Expired - LinkPipe</title>
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
                <h1>Link Expired</h1>
                <p>This short link has expired.</p>
                <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to LinkPipe</a></p>
              </div>
            </div>
          </body>
        </html>
      `);
    }

    // Build the final URL with UTM parameters
    const finalUrl = appendUtmParams(link.url, link.utm_params);

    // Log the redirect (in production, you might want to store this in DynamoDB for analytics)
    console.log(`🔗 Redirecting ${slug} -> ${finalUrl}`);

    // Set cache headers to prevent caching of redirects
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });

    // Preserve original referrer and headers
    if (req.get('Referer')) {
      res.set('Referer', req.get('Referer')!);
    }

    // Perform the redirect
    res.redirect(302, finalUrl);
  } catch (error) {
    console.error('Error processing redirect:', error);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Service Error - LinkPipe</title>
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
              <h1>Service Error</h1>
              <p>We're sorry, but something went wrong processing your request.</p>
              <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">Go to LinkPipe</a></p>
            </div>
          </div>
        </body>
      </html>
    `);
  }
}); 