import axios from 'axios'
import type { 
  CreateShortLinkRequest, 
  UpdateShortLinkRequest,
  ShortLink,
  ApiResponse 
} from '@shared/types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use((config) => {
  // Add auth token if available
  const token = localStorage.getItem('linkpipe_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('linkpipe_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const linkApi = {
  // Create a new short link
  create: async (data: CreateShortLinkRequest): Promise<ShortLink> => {
    const response = await api.post<ApiResponse<ShortLink>>('/links', data)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create link')
    }
    return response.data.data!
  },

  // Get all links
  getAll: async (): Promise<ShortLink[]> => {
    const response = await api.get<ApiResponse<ShortLink[]>>('/links')
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch links')
    }
    return response.data.data!
  },

  // Get a specific link by slug
  getBySlug: async (slug: string): Promise<ShortLink> => {
    const response = await api.get<ApiResponse<ShortLink>>(`/links/${slug}`)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch link')
    }
    return response.data.data!
  },

  // Update a link
  update: async (slug: string, data: UpdateShortLinkRequest): Promise<ShortLink> => {
    const response = await api.put<ApiResponse<ShortLink>>(`/links/${slug}`, data)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update link')
    }
    return response.data.data!
  },

  // Delete a link
  delete: async (slug: string): Promise<void> => {
    const response = await api.delete<ApiResponse>(`/links/${slug}`)
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete link')
    }
  },

  // Check if slug is available
  checkSlug: async (slug: string): Promise<boolean> => {
    try {
      await api.head(`/links/${slug}`)
      return false // Slug exists
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return true // Slug is available
      }
      throw error
    }
  },
}

export const redirectApi = {
  // Get redirect URL (for testing purposes)
  getRedirectUrl: async (slug: string): Promise<string> => {
    const redirectBaseUrl = import.meta.env.VITE_REDIRECT_URL || 'http://localhost:8001'
    const response = await axios.get(`${redirectBaseUrl}/r/${slug}`, {
      maxRedirects: 0,
      validateStatus: (status) => status === 302,
    })
    return response.headers.location
  },
}

export default api 