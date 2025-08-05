import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prismaDb } from '../lib/prisma';
import { ValidationError } from '../types';

// Initialize the router
export const settingsRouter = Router();

// Settings validation schemas
const UpdateSettingSchema = z.object({
  value: z.any(),
  description: z.string().optional(),
});

const UpdateMultipleSettingsSchema = z.record(z.object({
  value: z.any(),
  description: z.string().optional(),
}));

// GET /settings - Get all settings
settingsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const settings = await prismaDb.getAllSettings();
    
    res.json({
      success: true,
      data: settings,
      message: 'Settings retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

// GET /settings/:key - Get a specific setting
settingsRouter.get('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const value = await prismaDb.getSetting(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: `Setting '${key}' not found`
      });
    }
    
    res.json({
      success: true,
      data: { [key]: value },
      message: 'Setting retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching setting:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting'
    });
  }
});

// PUT /settings/:key - Update a specific setting
settingsRouter.put('/:key', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const validatedData = UpdateSettingSchema.parse(req.body);
    
    await prismaDb.updateSetting(key, validatedData.value, validatedData.description);
    
    res.json({
      success: true,
      message: `Setting '${key}' updated successfully`
    });
  } catch (error) {
    console.error('Error updating setting:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update setting'
      });
    }
  }
});

// PUT /settings - Update multiple settings
settingsRouter.put('/', async (req: Request, res: Response) => {
  try {
    const validatedData = UpdateMultipleSettingsSchema.parse(req.body);
    
    // Update each setting
    for (const [key, settingData] of Object.entries(validatedData)) {
      await prismaDb.updateSetting(key, settingData.value, settingData.description);
    }
    
    res.json({
      success: true,
      message: `${Object.keys(validatedData).length} settings updated successfully`
    });
  } catch (error) {
    console.error('Error updating settings:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to update settings'
      });
    }
  }
});