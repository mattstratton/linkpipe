const API_BASE_URL = import.meta.env?.VITE_API_URL || '/api'

// Simplified types for now
interface UtmParams {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_term?: string
  utm_content?: string
}

interface CreateShortLinkRequest {
  url: string
  slug?: string
  utm_params?: UtmParams
  tags?: string[]
  description?: string
  expiresAt?: string
}

interface ShortLink {
  slug: string
  url: string
  utm_params?: UtmParams
  createdAt: string
  updatedAt?: string
  tags?: string[]
  description?: string
  expiresAt?: string
  isActive: boolean
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const data: ApiResponse<T> = await response.json()
  
  if (!data.success) {
    throw new Error(data.error || 'API request failed')
  }

  return data.data!
}

export const linkApi = {
  // Create a new short link
  create: async (data: CreateShortLinkRequest): Promise<ShortLink> => {
    return apiRequest<ShortLink>('/links', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  // Get all links
  getAll: async (): Promise<ShortLink[]> => {
    return apiRequest<ShortLink[]>('/links')
  },

  // Get a specific link by slug
  getBySlug: async (slug: string): Promise<ShortLink> => {
    return apiRequest<ShortLink>(`/links/${slug}`)
  },

  // Update a link
  update: async (slug: string, data: Partial<CreateShortLinkRequest>): Promise<ShortLink> => {
    return apiRequest<ShortLink>(`/links/${slug}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  // Delete a link
  delete: async (slug: string): Promise<void> => {
    return apiRequest<void>(`/links/${slug}`, {
      method: 'DELETE',
    })
  },

  // Check if slug is available
  checkSlug: async (slug: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/links/${slug}`, {
        method: 'HEAD',
      })
      return response.status === 404 // Available if not found
    } catch (error) {
      return true // Assume available on error
    }
  },
}

export type { CreateShortLinkRequest, ShortLink, UtmParams } 