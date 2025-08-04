import { UtmParams } from './types';

/**
 * Generate a random slug for short URLs
 */
export function generateSlug(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate and normalize a custom slug
 */
export function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '')
    .substring(0, 50);
}

/**
 * Check if slug is valid
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-zA-Z0-9-_]{1,50}$/.test(slug);
}

/**
 * Append UTM parameters to a URL
 */
export function appendUtmParams(url: string, utmParams?: UtmParams): string {
  if (!utmParams || Object.keys(utmParams).length === 0) {
    return url;
  }

  const urlObj = new URL(url);
  
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value && value.trim()) {
      urlObj.searchParams.set(key, value.trim());
    }
  });

  return urlObj.toString();
}

/**
 * Extract UTM parameters from a URL
 */
export function extractUtmParams(url: string): UtmParams {
  const urlObj = new URL(url);
  const utmParams: UtmParams = {};

  const utmKeys: (keyof UtmParams)[] = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ];

  utmKeys.forEach(key => {
    const value = urlObj.searchParams.get(key);
    if (value) {
      utmParams[key] = value;
    }
  });

  return utmParams;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Generate QR code URL (using a free service)
 */
export function generateQrCodeUrl(url: string, size: number = 200): string {
  const encodedUrl = encodeURIComponent(url);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}`;
}

/**
 * Check if date is expired
 */
export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Get domain from URL
 */
export function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

/**
 * Environment detection utilities
 */
export const env = {
  isDevelopment: (): boolean => process.env.NODE_ENV === 'development',
  isProduction: (): boolean => process.env.NODE_ENV === 'production',
  isTest: (): boolean => process.env.NODE_ENV === 'test',
};

/**
 * Rate limiting utility (for future use)
 */
export function createRateLimitKey(ip: string, action: string): string {
  return `ratelimit:${ip}:${action}`;
} 