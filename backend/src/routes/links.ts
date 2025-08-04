import { Router, Request, Response } from 'express';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { 
  CreateShortLinkRequestSchema, 
  UpdateShortLinkRequestSchema,
  ShortLink,
  ValidationError,
  NotFoundError,
  ConflictError,
  generateSlug,
  isValidSlug
} from '@linkpipe/shared';
import { getTableName } from '../lib/dynamodb';

// This will be imported from the main server file
let docClient: DynamoDBDocumentClient;

// Initialize the router
export const linksRouter = Router();

// Set the DynamoDB client (called from server.ts)
export function setDocClient(client: DynamoDBDocumentClient) {
  docClient = client;
}

// GET /links - List all links
linksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const result = await docClient.send(new ScanCommand({
      TableName: getTableName(),
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':isActive': true,
      },
    }));

    const links = result.Items as ShortLink[];
    
    res.json({
      success: true,
      data: links || [],
      count: links?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch links',
    });
  }
});

// POST /links - Create a new short link
linksRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = CreateShortLinkRequestSchema.parse(req.body);
    
    // Generate slug if not provided
    let slug = validatedData.slug;
    if (!slug) {
      // Generate a unique slug
      slug = generateSlug(6);
      
      // Check if generated slug exists (retry if collision)
      let attempts = 0;
      while (attempts < 10) {
        try {
          await docClient.send(new GetCommand({
            TableName: getTableName(),
            Key: { slug },
          }));
          // Slug exists, generate a new one
          slug = generateSlug(6 + Math.floor(attempts / 3));
          attempts++;
        } catch (error) {
          // Slug doesn't exist, we can use it
          break;
        }
      }
      
      if (attempts >= 10) {
        throw new ConflictError('Unable to generate unique slug after multiple attempts');
      }
    } else {
      // Validate custom slug
      if (!isValidSlug(slug)) {
        throw new ValidationError('Invalid slug format. Use only letters, numbers, hyphens, and underscores.');
      }
      
      // Check if custom slug already exists
      try {
        const existingItem = await docClient.send(new GetCommand({
          TableName: getTableName(),
          Key: { slug },
        }));
        
        if (existingItem.Item) {
          throw new ConflictError('Slug already exists');
        }
      } catch (error) {
        if (!(error instanceof ConflictError)) {
          // Slug doesn't exist, which is what we want
        } else {
          throw error;
        }
      }
    }

    // Create the link object
    const now = new Date().toISOString();
    const link: ShortLink = {
      slug,
      url: validatedData.url,
      utm_params: validatedData.utm_params,
      createdAt: now,
      updatedAt: now,
      tags: validatedData.tags,
      description: validatedData.description,
      expiresAt: validatedData.expiresAt,
      isActive: true,
    };

    // Save to DynamoDB
    await docClient.send(new PutCommand({
      TableName: getTableName(),
      Item: link,
      ConditionExpression: 'attribute_not_exists(slug)', // Ensure no overwrite
    }));

    res.status(201).json({
      success: true,
      data: link,
      message: 'Short link created successfully',
    });
  } catch (error) {
    console.error('Error creating link:', error);
    
    if (error instanceof ValidationError || error instanceof ConflictError) {
      throw error; // Will be handled by error middleware
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create link',
    });
  }
});

// GET /links/:slug - Get a specific link
linksRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }

    const result = await docClient.send(new GetCommand({
      TableName: getTableName(),
      Key: { slug },
    }));

    if (!result.Item) {
      throw new NotFoundError('Link not found');
    }

    const link = result.Item as ShortLink;
    
    res.json({
      success: true,
      data: link,
    });
  } catch (error) {
    console.error('Error fetching link:', error);
    
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch link',
    });
  }
});

// PUT /links/:slug - Update a link
linksRouter.put('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }

    // Validate request body
    const validatedData = UpdateShortLinkRequestSchema.parse(req.body);

    // Check if link exists
    const existingResult = await docClient.send(new GetCommand({
      TableName: getTableName(),
      Key: { slug },
    }));

    if (!existingResult.Item) {
      throw new NotFoundError('Link not found');
    }

    // Build update expression
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    if (validatedData.url !== undefined) {
      updateExpressions.push('#url = :url');
      expressionAttributeNames['#url'] = 'url';
      expressionAttributeValues[':url'] = validatedData.url;
    }

    if (validatedData.utm_params !== undefined) {
      updateExpressions.push('utm_params = :utm_params');
      expressionAttributeValues[':utm_params'] = validatedData.utm_params;
    }

    if (validatedData.tags !== undefined) {
      updateExpressions.push('tags = :tags');
      expressionAttributeValues[':tags'] = validatedData.tags;
    }

    if (validatedData.description !== undefined) {
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = validatedData.description;
    }

    if (validatedData.expiresAt !== undefined) {
      updateExpressions.push('expiresAt = :expiresAt');
      expressionAttributeValues[':expiresAt'] = validatedData.expiresAt;
    }

    if (validatedData.isActive !== undefined) {
      updateExpressions.push('isActive = :isActive');
      expressionAttributeValues[':isActive'] = validatedData.isActive;
    }

    // Always update the updatedAt timestamp
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    if (updateExpressions.length === 1) { // Only updatedAt
      throw new ValidationError('No fields to update');
    }

    // Perform the update
    const result = await docClient.send(new UpdateCommand({
      TableName: getTableName(),
      Key: { slug },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }));

    const updatedLink = result.Attributes as ShortLink;

    res.json({
      success: true,
      data: updatedLink,
      message: 'Link updated successfully',
    });
  } catch (error) {
    console.error('Error updating link:', error);
    
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to update link',
    });
  }
});

// DELETE /links/:slug - Delete a link
linksRouter.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }

    // Check if link exists
    const existingResult = await docClient.send(new GetCommand({
      TableName: getTableName(),
      Key: { slug },
    }));

    if (!existingResult.Item) {
      throw new NotFoundError('Link not found');
    }

    // Delete the link
    await docClient.send(new DeleteCommand({
      TableName: getTableName(),
      Key: { slug },
    }));

    res.json({
      success: true,
      message: 'Link deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      throw error;
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete link',
    });
  }
});

// HEAD /links/:slug - Check if a link exists (for slug availability)
linksRouter.head('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      return res.status(400).end();
    }

    const result = await docClient.send(new GetCommand({
      TableName: getTableName(),
      Key: { slug },
    }));

    if (result.Item) {
      res.status(200).end(); // Link exists
    } else {
      res.status(404).end(); // Link doesn't exist
    }
  } catch (error) {
    console.error('Error checking link:', error);
    res.status(500).end();
  }
}); 