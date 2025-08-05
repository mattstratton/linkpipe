import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { ArrowLeft, Copy, ExternalLink, Loader2 } from 'lucide-react'
import { linkApi, settingsApi, CreateShortLinkRequest } from '../lib/api'
import { buildShortUrl, copyToClipboard, validateUrl } from '../lib/utils'
import SelectWithCustom from '../components/ui/SelectWithCustom'

export default function CreateLinkPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<any | null>(null)

  // Fetch settings for dropdown options
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
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

  // Create link mutation
  const createLinkMutation = useMutation({
    mutationFn: linkApi.create,
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
        requestData.tags = formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
      }

      // Create the link using the mutation
      createLinkMutation.mutate(requestData)
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 
                          typeof err === 'string' ? err : 
                          'Failed to create link'
      setError(errorMessage)
    }
  }

  const handleCopyLink = async () => {
    if (createdLink) {
      try {
        const domain = createdLink.domain || 'localhost:8001';
        const protocol = domain.includes('localhost') ? 'http://' : 'https://';
        const shortUrl = `${protocol}${domain}/${createdLink.slug}`;
        await copyToClipboard(shortUrl);
        // You could add a toast notification here
        console.log('Link copied to clipboard!')
      } catch (err) {
        console.error('Failed to copy link:', err)
      }
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

  // Show success screen if link was created
  if (createdLink) {
    const domain = createdLink.domain || 'localhost:8001';
    const protocol = domain.includes('localhost') ? 'http://' : 'https://';
    const shortUrl = `${protocol}${domain}/${createdLink.slug}`;
    
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Link Created Successfully!</h1>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <ExternalLink className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Your short link is ready!
              </h2>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between">
                  <code className="text-lg font-mono text-primary-600 flex-1 text-left">
                    {shortUrl}
                  </code>
                  <button
                    onClick={handleCopyLink}
                    className="ml-2 p-2 text-gray-400 hover:text-gray-600"
                    title="Copy to clipboard"
                  >
                    <Copy className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600 mb-6">
                <p><strong>Destination:</strong> {createdLink.url}</p>
                {createdLink.description && (
                  <p><strong>Description:</strong> {createdLink.description}</p>
                )}
                {createdLink.utm_params && Object.keys(createdLink.utm_params).length > 0 && (
                  <div>
                    <strong>UTM Parameters:</strong>
                    <ul className="list-disc list-inside ml-4 mt-1">
                      {Object.entries(createdLink.utm_params).map(([key, value]) => (
                        <li key={key}>{key}: {value}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleCreateAnother}
                  className="btn btn-primary"
                >
                  Create Another Link
                </button>
                <Link
                  to="/dashboard"
                  className="btn btn-outline"
                >
                  View Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <Link
          to="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Create Short Link</h1>
        <p className="text-gray-600 mt-2">
          Create a new short link with optional UTM parameters for tracking.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {String(error).includes('already taken') ? 'Slug Already Exists' : 'Error Creating Link'}
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{String(error)}</p>
                {String(error).includes('already taken') && (
                  <div className="mt-2">
                    <p className="font-medium">Suggestions:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Try adding numbers or hyphens to make it unique</li>
                      <li>Use a different word or phrase</li>
                      <li>Leave the slug blank to generate one automatically</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-content">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL to shorten *
              </label>
              <input
                type="url"
                id="url"
                name="url"
                value={formData.url}
                onChange={handleInputChange}
                placeholder="https://example.com/your-long-url"
                className="input"
                required
                disabled={createLinkMutation.isPending}
              />
            </div>

            {/* Domain Selection */}
            <div>
              <label htmlFor="domain" className="block text-sm font-medium text-gray-700 mb-2">
                Domain (optional)
              </label>
              {settingsLoading ? (
                <div className="flex items-center py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400 mr-2" />
                  <span className="text-gray-600">Loading domains...</span>
                </div>
              ) : (
                <SelectWithCustom
                  label="Domain"
                  id="domain"
                  name="domain"
                  value={formData.domain}
                  onChange={handleInputChange}
                  options={settings?.domains || []}
                  placeholder="Select or enter domain"
                  disabled={createLinkMutation.isPending}
                />
              )}
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to use default domain
              </p>
            </div>

            {/* Custom Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                Custom slug (optional)
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2">
                  {formData.domain || (settings?.domains?.[0] || 'localhost:8001')}/
                </span>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  value={formData.slug}
                  onChange={handleInputChange}
                  placeholder="my-custom-link"
                  className="input flex-1"
                  disabled={createLinkMutation.isPending}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to generate automatically
              </p>
            </div>

            {/* UTM Parameters */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">UTM Parameters</h3>
              
              {settingsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-gray-600">Loading UTM options...</span>
                </div>
              ) : (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <SelectWithCustom
                      label="UTM Source"
                      id="utm_source"
                      name="utm_source"
                      value={formData.utm_source}
                      onChange={handleInputChange}
                      options={settings?.utm_sources || []}
                      placeholder="Select or enter UTM source"
                      disabled={createLinkMutation.isPending}
                    />
                    
                    <SelectWithCustom
                      label="UTM Medium"
                      id="utm_medium"
                      name="utm_medium"
                      value={formData.utm_medium}
                      onChange={handleInputChange}
                      options={settings?.utm_mediums || []}
                      placeholder="Select or enter UTM medium"
                      disabled={createLinkMutation.isPending}
                    />
                    
                    <SelectWithCustom
                      label="UTM Campaign"
                      id="utm_campaign"
                      name="utm_campaign"
                      value={formData.utm_campaign}
                      onChange={handleInputChange}
                      options={settings?.utm_campaigns || []}
                      placeholder="Select or enter UTM campaign"
                      disabled={createLinkMutation.isPending}
                    />
                    
                    <div>
                      <label htmlFor="utm_term" className="block text-sm font-medium text-gray-700 mb-2">
                        UTM Term
                      </label>
                      <input
                        type="text"
                        id="utm_term"
                        name="utm_term"
                        value={formData.utm_term}
                        onChange={handleInputChange}
                        placeholder="running shoes, keyword, etc."
                        className="input"
                        disabled={createLinkMutation.isPending}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <SelectWithCustom
                      label="UTM Content"
                      id="utm_content"
                      name="utm_content"
                      value={formData.utm_content}
                      onChange={handleInputChange}
                      options={settings?.utm_contents || []}
                      placeholder="Select or enter UTM content"
                      disabled={createLinkMutation.isPending}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Additional Options */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Options</h3>
              
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
                  placeholder="A brief description of this link..."
                  className="input"
                  disabled={createLinkMutation.isPending}
                />
              </div>
              
              <div className="mt-4">
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                  Tags (optional)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={formData.tags}
                  onChange={handleInputChange}
                  placeholder="marketing, campaign, email"
                  className="input"
                  disabled={createLinkMutation.isPending}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate tags with commas
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={createLinkMutation.isPending}
                className="btn btn-primary flex-1"
              >
                {createLinkMutation.isPending ? 'Creating...' : 'Create Short Link'}
              </button>
              <Link
                to="/"
                className="btn btn-outline px-6"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 