import { Request, Response, NextFunction } from 'express';
import { LinkPipeError, ValidationError, NotFoundError, ConflictError } from '@linkpipe/shared';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('❌ Error:', error);

  // Handle known LinkPipe errors
  if (error instanceof LinkPipeError) {
    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.message,
    });
    return;
  }

  // Handle AWS SDK errors
  if (error.name === 'ConditionalCheckFailedException') {
    res.status(409).json({
      success: false,
      error: 'Resource already exists',
    });
    return;
  }

  if (error.name === 'ResourceNotFoundException') {
    res.status(404).json({
      success: false,
      error: 'Resource not found',
    });
    return;
  }

  // Handle generic errors
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
} 