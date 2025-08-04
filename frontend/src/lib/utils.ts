import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  } else {
    // Fallback for non-secure contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'absolute'
    textArea.style.left = '-999999px'
    document.body.prepend(textArea)
    textArea.select()
    try {
      document.execCommand('copy')
    } catch (error) {
      console.error('Failed to copy text: ', error)
      throw new Error('Failed to copy to clipboard')
    } finally {
      textArea.remove()
    }
    return Promise.resolve()
  }
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getBaseUrl(): string {
  const redirectUrl = import.meta.env.VITE_REDIRECT_URL
  if (redirectUrl) {
    return redirectUrl
  }
  
  // Fallback to current domain in production
  if (import.meta.env.PROD) {
    return `${window.location.protocol}//${window.location.host}`
  }
  
  return 'http://localhost:8001'
}

export function buildShortUrl(slug: string): string {
  return `${getBaseUrl()}/r/${slug}`
}

export function validateUrl(url: string): boolean {
  try {
    const urlObj = new URL(url)
    return ['http:', 'https:'].includes(urlObj.protocol)
  } catch {
    return false
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 