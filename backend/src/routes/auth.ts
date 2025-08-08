import { Router, Request, Response } from 'express';
import passport from 'passport';
import { z } from 'zod';
import { prismaDb } from '../lib/prisma';
import { requireAuth, generateToken, hashPassword } from '../middleware/auth';

const router = Router();

// Validation schemas
const LoginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

const RegisterSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().optional(),
});

// Basic Auth Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = LoginSchema.parse(req.body);
    
    const user = await prismaDb.getUserByUsername(username);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user);
    
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, email, password, name } = RegisterSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await prismaDb.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const existingEmail = await prismaDb.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);
    
    // Create user
    const user = await prismaDb.createUser({
      username,
      email,
      password: hashedPassword,
      name,
      provider: 'basic',
    });

    // Generate JWT token
    const token = generateToken(user);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: 'Registration failed' });
  }
});

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));

router.get('/github/callback', 
  passport.authenticate('github', { failureRedirect: '/login' }),
  (req: Request, res: Response) => {
    // Generate JWT token
    const token = generateToken(req.user);
    
    // Redirect to frontend with token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback?token=${token}`);
  }
);

// Get current user
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await prismaDb.getUserById((req.user as any).id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        provider: user.provider,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Logout
router.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    // In a more complex setup, you might want to invalidate the JWT token
    // For now, we'll just return success
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Change password
router.post('/change-password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = await prismaDb.getUserById((req.user as any).id);
    if (!user || !user.password) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update password
    await prismaDb.updateUser(user.id, { password: hashedPassword });
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export { router as authRouter }; 