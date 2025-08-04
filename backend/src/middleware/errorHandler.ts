import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { LinkPipeError, ValidationError, NotFoundError, ConflictError } from '../types';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const validationErrors = err.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
    }));

    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: validationErrors,
    });
    return;
  }

  // Handle custom LinkPipe errors
  if (err instanceof LinkPipeError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Handle AWS SDK errors
  if (err.name === 'ResourceNotFoundException') {
    res.status(404).json({
      success: false,
      error: 'Resource not found',
    });
    return;
  }

  if (err.name === 'ConditionalCheckFailedException') {
    res.status(409).json({
      success: false,
      error: 'Resource already exists',
    });
    return;
  }

  if (err.name === 'ValidationException') {
    res.status(400).json({
      success: false,
      error: 'Invalid request data',
    });
    return;
  }

  // Handle generic errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { 
      details: err.message,
      stack: err.stack 
    }),
  });
} 