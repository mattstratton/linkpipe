// Re-export types from shared package for consistency
export {
  UtmParamsSchema,
  ShortLinkSchema,
  CreateShortLinkRequestSchema,
  UpdateShortLinkRequestSchema,
  UtmParams,
  ShortLink,
  CreateShortLinkRequest,
  UpdateShortLinkRequest,
} from '@linkpipe/shared';

// Custom Error Classes
export class LinkPipeError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message)
    this.name = 'LinkPipeError'
  }
}

export class ValidationError extends LinkPipeError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR')
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends LinkPipeError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND')
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends LinkPipeError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT')
    this.name = 'ConflictError'
  }
} 