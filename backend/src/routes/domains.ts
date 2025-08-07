import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prismaDb } from '../lib/prisma';
import { ValidationError } from '../types';
import { requireAuth } from '../middleware/auth';

// Initialize the router
export const domainsRouter = Router();

// Apply authentication to all routes
domainsRouter.use(requireAuth);

// Domain validation schemas
const CreateDomainSchema = z.object({
  name: z.string().min(1, 'Domain name is required'),
  isDefault: z.boolean().optional(),
});

const UpdateDomainSchema = z.object({
  name: z.string().min(1, 'Domain name is required').optional(),
  isDefault: z.boolean().optional(),
});

// GET /domains - Get all domains
domainsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const domains = await prismaDb.getAllDomains();
    
    res.json({
      success: true,
      data: domains,
      message: 'Domains retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching domains:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch domains'
    });
  }
});

// POST /domains - Create a new domain
domainsRouter.post('/', async (req: Request, res: Response) => {
  try {
    const validatedData = CreateDomainSchema.parse(req.body);
    
    // If this domain is being set as default, unset any existing default
    if (validatedData.isDefault) {
      await prismaDb.unsetDefaultDomain();
    }
    
    const domain = await prismaDb.createDomain(validatedData.name, validatedData.isDefault || false);
    
    res.status(201).json({
      success: true,
      data: domain,
      message: 'Domain created successfully'
    });
  } catch (error) {
    console.error('Error creating domain:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create domain'
      });
    }
  }
});

// PUT /domains/:id - Update a domain
domainsRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateDomainSchema.parse(req.body);
    
    // If this domain is being set as default, unset any existing default
    if (validatedData.isDefault) {
      await prismaDb.unsetDefaultDomain();
    }
    
    const domain = await prismaDb.updateDomain(id, validatedData);
    
    res.json({
      success: true,
      data: domain,
      message: 'Domain updated successfully'
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update domain'
      });
    }
  }
});

// DELETE /domains/:id - Delete a domain
domainsRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prismaDb.deleteDomain(id);
    
    res.json({
      success: true,
      message: 'Domain deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting domain:', error);
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete domain'
      });
    }
  }
});

// POST /domains/:id/set-default - Set a domain as default
domainsRouter.post('/:id/set-default', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await prismaDb.setDefaultDomain(id);
    
    res.json({
      success: true,
      message: 'Default domain set successfully'
    });
  } catch (error) {
    console.error('Error setting default domain:', error);
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to set default domain'
      });
    }
  }
}); 