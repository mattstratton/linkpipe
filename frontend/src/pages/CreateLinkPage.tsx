import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { linkApi, settingsApi, domainsApi, CreateShortLinkRequest, ShortLink } from '../lib/api'
import { buildShortUrl, copyToClipboard, validateUrl } from '../lib/utils'
import SelectWithCustom from '../components/ui/SelectWithCustom'

export default function CreateLinkPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<any | null>(null)

  // Check if we're in edit mode
  const isEditMode = location.state?.editMode
  const linkData = location.state?.linkData as ShortLink | undefined

  // Fetch settings and domains for dropdown options
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  })

  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.getAll,
  })
  
  const [formData, setFormData] = useState({
    url: '',
    slug: '',
    domain: '',
    utm_source: '',
    utm_medium: '',
    utm_campaign: '',
    utm_term: '',
    utm_content: '',
    description: '',
    tags: '',
  })

  // Populate form with existing data if in edit mode or cloning
  useEffect(() => {
    if (linkData) {
      setFormData({
        url: linkData.url,
        slug: isEditMode ? linkData.slug : '', // Only include slug if editing
        domain: linkData.domain || '',
        utm_source: linkData.utm_params?.utm_source || '',
        utm_medium: linkData.utm_params?.utm_medium || '',
        utm_campaign: linkData.utm_params?.utm_campaign || '',
        utm_term: linkData.utm_params?.utm_term || '',
        utm_content: linkData.utm_params?.utm_content || '',
        description: linkData.description || '',
        tags: linkData.tags?.join(', ') || '',
      })
    }
  }, [linkData, isEditMode])

  // Create/Update link mutation
  const createLinkMutation = useMutation({
    mutationFn: isEditMode && linkData 
      ? (data: CreateShortLinkRequest) => linkApi.update(linkData.slug, data)
      : linkApi.create,
    onSuccess: (link) => {
      setCreatedLink(link)
      setError(null)
      // Invalidate and refetch links to update the dashboard
      queryClient.invalidateQueries({ queryKey: ['links'] })
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : 
                          typeof err === 'string' ? err : 
                          'Failed to create link'
      setError(errorMessage)
    }
  })

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    try {
      // Validate URL
      if (!formData.url.trim()) {
        throw new Error('URL is required')
      }

      if (!validateUrl(formData.url)) {
        throw new Error('Please enter a valid URL')
      }

      // Prepare request data
      const requestData: CreateShortLinkRequest = {
        url: formData.url.trim(),
      }

      // Add optional fields if provided
      if (formData.slug.trim()) {
        requestData.slug = formData.slug.trim()
      }

      if (formData.domain.trim()) {
        requestData.domain = formData.domain.trim()
      }

      // Add UTM parameters if any are provided
      const utmParams: any = {}
      if (formData.utm_source.trim()) utmParams.utm_source = formData.utm_source.trim()
      if (formData.utm_medium.trim()) utmParams.utm_medium = formData.utm_medium.trim()
      if (formData.utm_campaign.trim()) utmParams.utm_campaign = formData.utm_campaign.trim()
      if (formData.utm_term.trim()) utmParams.utm_term = formData.utm_term.trim()
      if (formData.utm_content.trim()) utmParams.utm_content = formData.utm_content.trim()

      if (Object.keys(utmParams).length > 0) {
        requestData.utm_params = utmParams
      }

      if (formData.description.trim()) {
        requestData.description = formData.description.trim()
      }

      if (formData.tags.trim()) {
        requestData.tags = formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      }

      // Submit the form
      await createLinkMutation.mutateAsync(requestData)
    } catch (err) {
      // Error is handled by the mutation
    }
  }

  const handleCopyLink = async () => {
    if (createdLink) {
      const shortUrl = buildShortUrl(createdLink.slug)
      await copyToClipboard(shortUrl)
    }
  }

  const handleCreateAnother = () => {
    setCreatedLink(null)
    setFormData({
      url: '',
      slug: '',
      domain: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      description: '',
      tags: '',
    })
  }

  // Show success state
  if (createdLink) {
    const shortUrl = buildShortUrl(createdLink.slug)
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExternalLink className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {isEditMode ? 'Link Updated!' : 'Link Created!'}
            </h1>
            <p className="text-gray-600">
              {isEditMode ? 'Your link has been successfully updated.' : 'Your short link is ready to use.'}
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 mb-1">Short Link</p>
                <p className="text-lg font-mono text-gray-900 break-all">{shortUrl}</p>
              </div>
              <button
                onClick={handleCopyLink}
                className="ml-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Copy to clipboard"
              >
                <Copy className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">Destination URL</p>
              <a
                href={createdLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm break-all"
              >
                {createdLink.url}
              </a>
            </div>
            
            {createdLink.description && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-1">Description</p>
                <p className="text-sm text-gray-900">{createdLink.description}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreateAnother}
              className="btn btn-secondary flex-1"
            >
              {isEditMode ? 'Edit Another Link' : 'Create Another Link'}
            </button>
            <Link to="/dashboard" className="btn btn-primary flex-1">
              View All Links
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Show loading state
  if (settingsLoading || domainsLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link to="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-3 text-gray-600">Loading settings...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link to="/dashboard" className="inline-flex items-center text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Link' : linkData ? 'Clone Link' : 'Create New Link'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isEditMode 
              ? 'Update your short link settings.' 
              : linkData 
                ? 'Create a new link based on the existing one.' 
                : 'Create a new short link with custom options.'
            }
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* URL Field */}
          <div>
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
              Destination URL *
            </label>
            <input
              type="url"
              id="url"
              name="url"
              value={formData.url}
              onChange={handleInputChange}
              placeholder="https://example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* Slug Field */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
              Custom Slug (optional)
            </label>
            <input
              type="text"
              id="slug"
              name="slug"
              value={formData.slug}
              onChange={handleInputChange}
              placeholder="my-custom-slug"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Leave empty to generate a random slug
            </p>
          </div>

          {/* Domain Selection */}
          <div>
            <div className="mb-2">
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                Domain
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Choose which domain this link will use. The selected domain will be used for the copy-paste function, 
                but the link will work with all configured domains.
              </p>
            </div>
            <SelectWithCustom
              id="domain"
              name="domain"
              value={formData.domain}
              onChange={handleInputChange}
              options={domains?.map(d => d.name) || []}
              label="Domain"
              placeholder="Select a domain"
            />
            {domains?.length === 0 && (
              <p className="mt-1 text-sm text-amber-600">
                No domains configured. Please add domains in the Settings page first.
              </p>
            )}
          </div>

          {/* Description Field */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={3}
              placeholder="Brief description of this link"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Tags Field */}
          <div>
            <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
              Tags (optional)
            </label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleInputChange}
              placeholder="tag1, tag2, tag3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="mt-1 text-sm text-gray-500">
              Separate tags with commas
            </p>
          </div>

          {/* UTM Parameters Section */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">UTM Parameters (optional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <SelectWithCustom
                  id="utm_source"
                  name="utm_source"
                  value={formData.utm_source}
                  onChange={handleInputChange}
                  options={settings?.utm_sources || []}
                  label="UTM Source"
                  placeholder="Select source"
                />
              </div>
              <div>
                <SelectWithCustom
                  id="utm_medium"
                  name="utm_medium"
                  value={formData.utm_medium}
                  onChange={handleInputChange}
                  options={settings?.utm_mediums || []}
                  label="UTM Medium"
                  placeholder="Select medium"
                />
              </div>
              <div>
                <SelectWithCustom
                  id="utm_campaign"
                  name="utm_campaign"
                  value={formData.utm_campaign}
                  onChange={handleInputChange}
                  options={settings?.utm_campaigns || []}
                  label="UTM Campaign"
                  placeholder="Select campaign"
                />
              </div>
              <div>
                <input
                  type="text"
                  id="utm_term"
                  name="utm_term"
                  value={formData.utm_term}
                  onChange={handleInputChange}
                  placeholder="UTM Term"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <SelectWithCustom
                  id="utm_content"
                  name="utm_content"
                  value={formData.utm_content}
                  onChange={handleInputChange}
                  options={settings?.utm_contents || []}
                  label="UTM Content"
                  placeholder="Select content"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-6">
            <Link to="/dashboard" className="btn btn-secondary flex-1">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={createLinkMutation.isPending}
              className="btn btn-primary flex-1"
            >
              {createLinkMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Link' : linkData ? 'Clone Link' : 'Create Link'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 