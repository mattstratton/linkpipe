import { z } from 'zod';

// UTM Parameters Schema
export const UtmParamsSchema = z.object({
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  utm_term: z.string().optional(),
  utm_content: z.string().optional(),
});

export type UtmParams = z.infer<typeof UtmParamsSchema>;

// Short Link Schema
export const ShortLinkSchema = z.object({
  id: z.string(),
  slug: z.string().min(1).max(50),
  url: z.string().url(),
  domain: z.string().optional(),
  utm_params: UtmParamsSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  tags: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
  clickCount: z.number().default(0),
});

export type ShortLink = z.infer<typeof ShortLinkSchema>;

// API Request/Response Schemas
export const CreateShortLinkRequestSchema = z.object({
  url: z.string().url(),
  slug: z.string().min(1).max(50).optional(),
  domain: z.string().optional(),
  utm_params: UtmParamsSchema.optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

export type CreateShortLinkRequest = z.infer<typeof CreateShortLinkRequestSchema>;

export const UpdateShortLinkRequestSchema = z.object({
  url: z.string().url().optional(),
  domain: z.string().optional(),
  utm_params: UtmParamsSchema.optional(),
  tags: z.array(z.string()).optional(),
  description: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateShortLinkRequest = z.infer<typeof UpdateShortLinkRequestSchema>;

// API Response Schemas
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
  message: z.string().optional(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Predefined UTM Values
export const PredefinedUtmValues = {
  sources: [
    'newsletter',
    'social',
    'website',
    'blog',
    'email',
    'direct',
    'referral',
    'organic',
    'paid',
  ],
  mediums: [
    'email',
    'social',
    'cpc',
    'banner',
    'affiliate',
    'referral',
    'direct',
    'organic',
    'print',
    'video',
  ],
  campaigns: [
    'spring_sale',
    'summer_promotion',
    'black_friday',
    'product_launch',
    'webinar',
    'newsletter_signup',
  ],
} as const;

// Analytics Schema (for future use)
export const ClickEventSchema = z.object({
  slug: z.string(),
  timestamp: z.string().datetime(),
  ip: z.string(),
  userAgent: z.string(),
  referer: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
});

export type ClickEvent = z.infer<typeof ClickEventSchema>;

// Database Table Names
export const TABLE_NAMES = {
  LINKS: 'linkpipe-urls',
  ANALYTICS: 'linkpipe-analytics',
} as const;

// Error Types
export class LinkPipeError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'LinkPipeError';
  }
}

export class ValidationError extends LinkPipeError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends LinkPipeError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends LinkPipeError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
} 