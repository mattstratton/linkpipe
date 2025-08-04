import { UtmParams } from './types'

/**
 * Generate a random slug for short URLs
 */
export function generateSlug(length: number = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  
  return result
}

/**
 * Validate if a slug contains only allowed characters
 */
export function isValidSlug(slug: string): boolean {
  // Allow alphanumeric characters, hyphens, and underscores
  const slugRegex = /^[a-zA-Z0-9_-]+$/
  return slugRegex.test(slug) && slug.length >= 1 && slug.length <= 100
}

/**
 * Append UTM parameters to a URL
 */
export function appendUtmParams(url: string, utmParams?: UtmParams): string {
  if (!utmParams) return url

  const urlObj = new URL(url)
  
  Object.entries(utmParams).forEach(([key, value]) => {
    if (value) {
      urlObj.searchParams.set(key, value)
    }
  })
  
  return urlObj.toString()
}

/**
 * Check if a date string represents an expired date
 */
export function isExpired(expiresAt?: string): boolean {
  if (!expiresAt) return false
  
  const expirationDate = new Date(expiresAt)
  const now = new Date()
  
  return expirationDate < now
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date = new Date()): string {
  return date.toISOString()
}

/**
 * Sanitize a slug by removing invalid characters
 */
export function sanitizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100)
}

/**
 * Parse and validate a URL
 */
export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
} 