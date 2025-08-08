import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import GitHubStrategy from 'passport-github2';
import { BasicStrategy } from 'passport-http';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prismaDb } from '../lib/prisma';

// Extend Express Request interface to include user
declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// GitHub OAuth Strategy (only if credentials are provided)
const githubClientId = process.env.GITHUB_CLIENT_ID;
const githubClientSecret = process.env.GITHUB_CLIENT_SECRET;

if (githubClientId && githubClientSecret) {
  passport.use(new GitHubStrategy({
    clientID: githubClientId,
    clientSecret: githubClientSecret,
    callbackURL: `${process.env.BACKEND_URL || 'http://localhost:8000'}/auth/github/callback`
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      // Check if user exists
      let user = await prismaDb.getUserByProviderId('github', profile.id);
      
      if (!user) {
        // Create new user
        user = await prismaDb.createUser({
          email: profile.emails?.[0]?.value || `${profile.username}@github.com`,
          username: profile.username || `github_${profile.id}`,
          name: profile.displayName || profile.username,
          avatar: profile.photos?.[0]?.value,
          provider: 'github',
          providerId: profile.id.toString(),
        });
      }
      
      return done(null, user);
    } catch (error) {
      return done(error as Error);
    }
  }));
}

// Basic Auth Strategy
passport.use(new BasicStrategy(async (username, password, done) => {
  try {
    const user = await prismaDb.getUserByUsername(username);
    
    if (!user || !user.password) {
      return done(null, false);
    }
    
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return done(null, false);
    }
    
    return done(null, user);
  } catch (error) {
    return done(error as Error);
  }
}));

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await prismaDb.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error as Error);
  }
});

// Authentication middleware
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  // Check for JWT token in Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded.user;
      return next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  }
  
  // Check for session-based auth
  if (req.isAuthenticated()) {
    return next();
  }
  
  // Try basic auth as fallback
  passport.authenticate('basic', { session: false }, (err: any, user: any) => {
    if (err || !user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        authMethods: githubClientId ? ['basic', 'github'] : ['basic']
      });
    }
    req.user = user;
    next();
  })(req, res, next);
};

// Optional auth middleware (doesn't fail if not authenticated)
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      req.user = decoded.user;
    } catch (error) {
      // Token invalid, but continue without user
    }
  }
  
  if (req.isAuthenticated()) {
    // User is authenticated via session
  }
  
  next();
};

// Generate JWT token
export const generateToken = (user: any): string => {
  return jwt.sign(
    { 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username 
      } 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return bcrypt.hash(password, saltRounds);
};

// Verify password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export default passport; 