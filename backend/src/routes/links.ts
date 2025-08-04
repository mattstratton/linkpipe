import { Router, Request, Response } from 'express';
import { DynamoDBDocumentClient, GetCommand, PutCommand, UpdateCommand, DeleteCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { 
  CreateShortLinkRequestSchema, 
  UpdateShortLinkRequestSchema,
  ShortLink,
  ValidationError,
  NotFoundError,
  ConflictError,
  CreateShortLinkRequest,
  UpdateShortLinkRequest
} from '../types';
import { 
  generateSlug,
  isValidSlug,
  formatDate,
  sanitizeSlug,
  validateUrl
} from '../utils';
import { getTableName } from '../lib/dynamodb';

// This will be imported from the main server file
let docClient: DynamoDBDocumentClient;

// Mock data store for when DynamoDB is unavailable
const mockLinks: Map<string, ShortLink> = new Map();
let useMockMode = false;

// Initialize the router
export const linksRouter = Router();

// Set the DynamoDB client (called from server.ts)
export function setDocClient(client: DynamoDBDocumentClient) {
  docClient = client;
}

// Helper function to handle DynamoDB operations with fallback to mock
async function executeDynamoOperation<T>(
  operation: () => Promise<T>,
  mockFallback: () => T,
  operationName: string
): Promise<T> {
  if (useMockMode) {
    console.log(`🔄 Using mock mode for ${operationName}`);
    return mockFallback();
  }

  try {
    return await operation();
  } catch (error) {
    console.warn(`⚠️ DynamoDB ${operationName} failed, switching to mock mode:`, error.message);
    useMockMode = true;
    return mockFallback();
  }
}

// GET /links - List all short links
linksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const links = await executeDynamoOperation(
      // DynamoDB operation
      async () => {
        const tableName = getTableName();
        const command = new ScanCommand({ TableName: tableName });
        const result = await docClient.send(command);
        return (result.Items as ShortLink[] || []).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
      // Mock fallback
      () => {
        return Array.from(mockLinks.values()).sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      },
      'scan'
    );

    res.json({
      success: true,
      data: links,
      message: `Found ${links.length} links${useMockMode ? ' (mock mode)' : ''}`
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch links'
    });
  }
});

// POST /links - Create a new short link
linksRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = CreateShortLinkRequestSchema.parse(req.body);
    
    // Validate URL format
    if (!validateUrl(validatedData.url)) {
      throw new ValidationError('Invalid URL format');
    }
    
    // Generate or validate slug
    let slug = validatedData.slug;
    if (slug) {
      slug = sanitizeSlug(slug);
      if (!isValidSlug(slug)) {
        throw new ValidationError('Invalid slug format. Use only letters, numbers, hyphens, and underscores.');
      }
    } else {
      slug = generateSlug();
    }
    
    // Check if slug already exists and get a unique one
    const finalSlug = await executeDynamoOperation(
      // DynamoDB operation
      async () => {
        const tableName = getTableName();
        let currentSlug = slug;
        let attempts = 0;
        
        while (attempts < 20) {
          const existingCommand = new GetCommand({
            TableName: tableName,
            Key: { slug: currentSlug }
          });
          
          const existingResult = await docClient.send(existingCommand);
          if (!existingResult.Item) {
            return currentSlug; // Slug is available
          }
          
          if (validatedData.slug) {
            throw new ConflictError(`Slug "${currentSlug}" is already taken`);
          }
          
          // Generate new slug for auto-generated ones
          currentSlug = generateSlug(6 + Math.floor(attempts / 10));
          attempts++;
        }
        
        throw new ConflictError('Unable to generate unique slug. Please try again.');
      },
      // Mock fallback
      () => {
        let currentSlug = slug;
        let attempts = 0;
        
        while (attempts < 20) {
          if (!mockLinks.has(currentSlug)) {
            return currentSlug; // Slug is available
          }
          
          if (validatedData.slug) {
            throw new ConflictError(`Slug "${currentSlug}" is already taken`);
          }
          
          currentSlug = generateSlug(6 + Math.floor(attempts / 10));
          attempts++;
        }
        
        throw new ConflictError('Unable to generate unique slug. Please try again.');
      },
      'slug check'
    );
    
    // Create the link object
    const now = formatDate();
    const link: ShortLink = {
      slug: finalSlug,
      url: validatedData.url,
      utm_params: validatedData.utm_params,
      createdAt: now,
      tags: validatedData.tags,
      description: validatedData.description,
      expiresAt: validatedData.expiresAt,
      isActive: true,
    };
    
    // Save the link
    await executeDynamoOperation(
      // DynamoDB operation
      async () => {
        const tableName = getTableName();
        const putCommand = new PutCommand({
          TableName: tableName,
          Item: link,
        });
        await docClient.send(putCommand);
        return null;
      },
      // Mock fallback
      () => {
        mockLinks.set(finalSlug, link);
        return null;
      },
      'put item'
    );
    
    res.status(201).json({
      success: true,
      data: link,
      message: `Short link created successfully${useMockMode ? ' (mock mode)' : ''}`
    });
  } catch (error) {
    console.error('Error creating link:', error);
    if (error instanceof ValidationError || error instanceof ConflictError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create link'
      });
    }
  }
});

// GET /links/:slug - Get a specific short link
linksRouter.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }
    
    const link = await executeDynamoOperation(
      // DynamoDB operation
      async () => {
        const tableName = getTableName();
        const command = new GetCommand({
          TableName: tableName,
          Key: { slug }
        });
        const result = await docClient.send(command);
        return result.Item as ShortLink | undefined;
      },
      // Mock fallback
      () => {
        return mockLinks.get(slug);
      },
      'get item'
    );
    
    if (!link) {
      throw new NotFoundError(`Link with slug "${slug}" not found`);
    }
    
    res.json({
      success: true,
      data: link,
      message: `Link found${useMockMode ? ' (mock mode)' : ''}`
    });
  } catch (error) {
    console.error('Error fetching link:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to fetch link'
      });
    }
  }
});

// PUT /links/:slug - Update a short link
linksRouter.put('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }
    
    const validatedData = UpdateShortLinkRequestSchema.parse(req.body);
    
    if (validatedData.url && !validateUrl(validatedData.url)) {
      throw new ValidationError('Invalid URL format');
    }
    
    const updatedLink = await executeDynamoOperation(
      // DynamoDB operation  
      async () => {
        const tableName = getTableName();
        
        // Check if exists
        const getCommand = new GetCommand({
          TableName: tableName,
          Key: { slug }
        });
        const existingResult = await docClient.send(getCommand);
        if (!existingResult.Item) {
          throw new NotFoundError(`Link with slug "${slug}" not found`);
        }
        
        // Build update expression
        const updateExpressions: string[] = ['#updatedAt = :updatedAt'];
        const expressionAttributeNames: Record<string, string> = { '#updatedAt': 'updatedAt' };
        const expressionAttributeValues: Record<string, any> = { ':updatedAt': formatDate() };
        
        if (validatedData.url !== undefined) {
          updateExpressions.push('#url = :url');
          expressionAttributeNames['#url'] = 'url';
          expressionAttributeValues[':url'] = validatedData.url;
        }
        
        if (validatedData.utm_params !== undefined) {
          updateExpressions.push('#utm_params = :utm_params');
          expressionAttributeNames['#utm_params'] = 'utm_params';
          expressionAttributeValues[':utm_params'] = validatedData.utm_params;
        }
        
        if (validatedData.tags !== undefined) {
          updateExpressions.push('#tags = :tags');
          expressionAttributeNames['#tags'] = 'tags';
          expressionAttributeValues[':tags'] = validatedData.tags;
        }
        
        if (validatedData.description !== undefined) {
          updateExpressions.push('#description = :description');
          expressionAttributeNames['#description'] = 'description';
          expressionAttributeValues[':description'] = validatedData.description;
        }
        
        if (validatedData.expiresAt !== undefined) {
          updateExpressions.push('#expiresAt = :expiresAt');
          expressionAttributeNames['#expiresAt'] = 'expiresAt';
          expressionAttributeValues[':expiresAt'] = validatedData.expiresAt;
        }
        
        if (validatedData.isActive !== undefined) {
          updateExpressions.push('#isActive = :isActive');
          expressionAttributeNames['#isActive'] = 'isActive';
          expressionAttributeValues[':isActive'] = validatedData.isActive;
        }
        
        const updateCommand = new UpdateCommand({
          TableName: tableName,
          Key: { slug },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
          ReturnValues: 'ALL_NEW'
        });
        
        const result = await docClient.send(updateCommand);
        return result.Attributes as ShortLink;
      },
      // Mock fallback
      () => {
        const existingLink = mockLinks.get(slug);
        if (!existingLink) {
          throw new NotFoundError(`Link with slug "${slug}" not found`);
        }
        
        const updatedLink: ShortLink = {
          ...existingLink,
          ...validatedData,
          updatedAt: formatDate(),
        };
        
        mockLinks.set(slug, updatedLink);
        return updatedLink;
      },
      'update item'
    );
    
    res.json({
      success: true,
      data: updatedLink,
      message: `Link updated successfully${useMockMode ? ' (mock mode)' : ''}`
    });
  } catch (error) {
    console.error('Error updating link:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update link'
      });
    }
  }
});

// DELETE /links/:slug - Delete a short link
linksRouter.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }
    
    await executeDynamoOperation(
      // DynamoDB operation
      async () => {
        const tableName = getTableName();
        
        // Check if exists
        const getCommand = new GetCommand({
          TableName: tableName,
          Key: { slug }
        });
        const existingResult = await docClient.send(getCommand);
        if (!existingResult.Item) {
          throw new NotFoundError(`Link with slug "${slug}" not found`);
        }
        
        // Delete
        const deleteCommand = new DeleteCommand({
          TableName: tableName,
          Key: { slug }
        });
        await docClient.send(deleteCommand);
        return null;
      },
      // Mock fallback
      () => {
        if (!mockLinks.has(slug)) {
          throw new NotFoundError(`Link with slug "${slug}" not found`);
        }
        mockLinks.delete(slug);
        return null;
      },
      'delete item'
    );
    
    res.json({
      success: true,
      message: `Link deleted successfully${useMockMode ? ' (mock mode)' : ''}`
    });
  } catch (error) {
    console.error('Error deleting link:', error);
    if (error instanceof ValidationError || error instanceof NotFoundError) {
      res.status(error.statusCode).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete link'
      });
    }
  }
});

// HEAD /links/:slug - Check if slug is available
linksRouter.head('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      return res.status(400).end();
    }
    
    const exists = await executeDynamoOperation(
      // DynamoDB operation
      async () => {
        const tableName = getTableName();
        const command = new GetCommand({
          TableName: tableName,
          Key: { slug }
        });
        const result = await docClient.send(command);
        return !!result.Item;
      },
      // Mock fallback
      () => {
        return mockLinks.has(slug);
      },
      'head check'
    );
    
    if (exists) {
      res.status(200).end(); // Slug exists
    } else {
      res.status(404).end(); // Slug is available
    }
  } catch (error) {
    console.error('Error checking slug:', error);
    res.status(500).end();
  }
}); 