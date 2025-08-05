const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || '/api'

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
  domain?: string
  utm_params?: UtmParams
  tags?: string[]
  description?: string
  expiresAt?: string
}

interface ShortLink {
  slug: string
  url: string
  domain: string
  utm_params?: UtmParams
  createdAt: string
  updatedAt?: string
  tags?: string[]
  description?: string
  expiresAt?: string
  isActive: boolean
  clickCount: number
}

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`
  
  // Get auth token
  const token = getAuthToken();
  
  // Prepare headers
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  });

  // Add auth header if token exists
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    headers,
    ...options,
  })

  if (!response.ok) {
    // Try to extract error message from response
    let errorMessage = `HTTP error! status: ${response.status}`
    
    try {
      const errorData = await response.json()
      if (errorData.error) {
        errorMessage = errorData.error
      } else if (errorData.message) {
        errorMessage = errorData.message
      }
    } catch {
      // If we can't parse the response, use a more specific error message
      if (response.status === 409) {
        errorMessage = 'This custom slug is already taken. Please try a different one.'
      } else if (response.status === 400) {
        errorMessage = 'Invalid request. Please check your input and try again.'
      } else if (response.status === 404) {
        errorMessage = 'The requested resource was not found.'
      } else if (response.status === 401) {
        errorMessage = 'Authentication required. Please log in.'
      } else if (response.status === 500) {
        errorMessage = 'Server error. Please try again later.'
      }
    }
    
    throw new Error(errorMessage)
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

// Settings API
interface Settings {
  domains: string[]
  utm_sources: string[]
  utm_mediums: string[]
  utm_campaigns: string[]
  utm_contents: string[]
}

export const settingsApi = {
  // Get all settings
  getAll: async (): Promise<Settings> => {
    const response = await apiRequest<Record<string, { value: any; description: string }>>('/settings')
    
    // Transform the response to a more usable format
    const settings: Settings = {
      domains: response.domains?.value || [],
      utm_sources: response.utm_sources?.value || [],
      utm_mediums: response.utm_mediums?.value || [],
      utm_campaigns: response.utm_campaigns?.value || [],
      utm_contents: response.utm_contents?.value || [],
    }
    
    return settings
  },

  // Update multiple settings
  updateAll: async (settings: Partial<Settings>): Promise<void> => {
    const requestData: Record<string, { value: any }> = {}
    
    if (settings.domains) {
      requestData.domains = { value: settings.domains }
    }
    if (settings.utm_sources) {
      requestData.utm_sources = { value: settings.utm_sources }
    }
    if (settings.utm_mediums) {
      requestData.utm_mediums = { value: settings.utm_mediums }
    }
    if (settings.utm_campaigns) {
      requestData.utm_campaigns = { value: settings.utm_campaigns }
    }
    if (settings.utm_contents) {
      requestData.utm_contents = { value: settings.utm_contents }
    }
    
    return apiRequest<void>('/settings', {
      method: 'PUT',
      body: JSON.stringify(requestData),
    })
  },
}

export type { CreateShortLinkRequest, ShortLink, UtmParams, Settings } 