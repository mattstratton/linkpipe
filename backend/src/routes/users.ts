import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prismaDb } from '../lib/prisma';
import { requireAuth, hashPassword } from '../middleware/auth';
import { ValidationError } from '../types';

// Initialize the router
export const usersRouter = Router();

// Apply authentication to all routes
usersRouter.use(requireAuth);

// User validation schemas
const CreateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
  provider: z.enum(['basic', 'github', 'google']).default('basic'),
});

const UpdateUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').optional(),
  email: z.string().email('Invalid email address').optional(),
  name: z.string().optional(),
  isActive: z.boolean().optional(),
});

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

// GET /users - Get all users (admin only)
usersRouter.get('/', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin check here
    const users = await prismaDb.getAllUsers();
    
    res.json({
      success: true,
      data: users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
      message: 'Users retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// GET /users/:id - Get a specific user
usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prismaDb.getUserById(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: 'User retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// POST /users - Create a new user (admin only)
usersRouter.post('/', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin check here
    const validatedData = CreateUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prismaDb.getUserByUsername(validatedData.username);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Username already exists'
      });
    }

    const existingEmail = await prismaDb.getUserByEmail(validatedData.email);
    if (existingEmail) {
      return res.status(409).json({
        success: false,
        error: 'Email already exists'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Create user
    const user = await prismaDb.createUser({
      username: validatedData.username,
      email: validatedData.email,
      password: hashedPassword,
      name: validatedData.name,
      provider: validatedData.provider,
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: 'User created successfully'
    });
  } catch (error) {
    console.error('Error creating user:', error);
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
        error: 'Failed to create user'
      });
    }
  }
});

// PUT /users/:id - Update a user
usersRouter.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const validatedData = UpdateUserSchema.parse(req.body);
    
    // Check if user exists
    const existingUser = await prismaDb.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Check for username conflicts if username is being updated
    if (validatedData.username && validatedData.username !== existingUser.username) {
      const usernameExists = await prismaDb.getUserByUsername(validatedData.username);
      if (usernameExists) {
        return res.status(409).json({
          success: false,
          error: 'Username already exists'
        });
      }
    }
    
    // Check for email conflicts if email is being updated
    if (validatedData.email && validatedData.email !== existingUser.email) {
      const emailExists = await prismaDb.getUserByEmail(validatedData.email);
      if (emailExists) {
        return res.status(409).json({
          success: false,
          error: 'Email already exists'
        });
      }
    }
    
    // Update user
    const user = await prismaDb.updateUser(id, validatedData);
    
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
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
        error: 'Failed to update user'
      });
    }
  }
});

// DELETE /users/:id - Delete a user (admin only)
usersRouter.delete('/:id', async (req: Request, res: Response) => {
  try {
    // TODO: Add admin check here
    const { id } = req.params;
    
    // Check if user exists
    const existingUser = await prismaDb.getUserById(id);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Delete user
    await prismaDb.deleteUser(id);
    
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to delete user'
      });
    }
  }
});

// POST /users/:id/change-password - Change user password
usersRouter.post('/:id/change-password', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    
    // Check if user exists
    const user = await prismaDb.getUserById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await prismaDb.updateUser(id, { password: hashedPassword });
    
    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Error changing password:', error);
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to change password'
      });
    }
  }
}); 