import { z } from 'zod'

// UTM Parameters schema
export const UtmParamsSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
}).optional()

// Short Link schema
export const ShortLinkSchema = z.object({
  slug: z.string(),
  url: z.string().url(),
  utm_params: UtmParamsSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().default(true),
})

// Create Short Link Request schema
export const CreateShortLinkRequestSchema = z.object({
  url: z.string().url(),
  slug: z.string().optional(),
  utm_params: UtmParamsSchema,
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
})

// Update Short Link Request schema
export const UpdateShortLinkRequestSchema = z.object({
  url: z.string().url().optional(),
  utm_params: UtmParamsSchema,
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  expiresAt: z.string().optional(),
  isActive: z.boolean().optional(),
})

// Type definitions
export type UtmParams = z.infer<typeof UtmParamsSchema>
export type ShortLink = z.infer<typeof ShortLinkSchema>
export type CreateShortLinkRequest = z.infer<typeof CreateShortLinkRequestSchema>
export type UpdateShortLinkRequest = z.infer<typeof UpdateShortLinkRequestSchema>

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