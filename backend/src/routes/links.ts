import { Router, Request, Response } from 'express';
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
import { prismaDb } from '../lib/prisma';

// Initialize the router
export const linksRouter = Router();

// GET /links - List all short links
linksRouter.get('/', async (req: Request, res: Response) => {
  try {
    const links = await prismaDb.getAllLinks();

    res.json({
      success: true,
      data: links,
      message: `Found ${links.length} links`
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
      
      // Check if custom slug already exists
      const exists = await prismaDb.slugExists(slug);
      if (exists) {
        throw new ConflictError(`Slug "${slug}" is already taken`);
      }
    } else {
      // Generate unique slug
      let attempts = 0;
      do {
        slug = generateSlug(6 + Math.floor(attempts / 10));
        attempts++;
        if (attempts > 20) {
          throw new ConflictError('Unable to generate unique slug. Please try again.');
        }
      } while (await prismaDb.slugExists(slug));
    }
    
    // Create the link
    const link = await prismaDb.createLink({
      slug,
      url: validatedData.url,
      domain: validatedData.domain,
      utm_params: validatedData.utm_params,
      description: validatedData.description,
      tags: validatedData.tags,
      expiresAt: validatedData.expiresAt,
    });
    
    res.status(201).json({
      success: true,
      data: link,
      message: 'Short link created successfully'
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
    
    const link = await prismaDb.getLinkBySlug(slug);
    
    if (!link) {
      throw new NotFoundError(`Link with slug "${slug}" not found`);
    }
    
    res.json({
      success: true,
      data: link,
      message: 'Link found'
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
    
    const updatedLink = await prismaDb.updateLink(slug, {
      url: validatedData.url,
      domain: validatedData.domain,
      utm_params: validatedData.utm_params,
      description: validatedData.description,
      tags: validatedData.tags,
      expiresAt: validatedData.expiresAt,
      isActive: validatedData.isActive,
    });
    
    if (!updatedLink) {
      throw new NotFoundError(`Link with slug "${slug}" not found`);
    }
    
    res.json({
      success: true,
      data: updatedLink,
      message: 'Link updated successfully'
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

// DELETE /links/:slug - Delete a short link (soft delete)
linksRouter.delete('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      throw new ValidationError('Invalid slug format');
    }
    
    const deleted = await prismaDb.deleteLink(slug);
    
    if (!deleted) {
      throw new NotFoundError(`Link with slug "${slug}" not found`);
    }
    
    res.json({
      success: true,
      message: 'Link deleted successfully'
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

// HEAD /links/:slug - Check if slug exists
linksRouter.head('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    
    if (!isValidSlug(slug)) {
      return res.status(400).end();
    }
    
    const exists = await prismaDb.slugExists(slug);
    
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