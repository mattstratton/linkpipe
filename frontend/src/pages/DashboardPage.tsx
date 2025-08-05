import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ExternalLink, Copy, Edit, Trash2, Loader2, AlertCircle, Eye, X } from 'lucide-react';
import { linkApi, ShortLink } from '../lib/api';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);

  // Fetch all links
  const { 
    data: links = [], 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['links'],
    queryFn: linkApi.getAll,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: linkApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links'] });
    },
  });

  // Copy to clipboard function
  const copyToClipboard = async (slug: string, domain?: string) => {
    const linkDomain = domain || 'localhost:8001';
    // Add protocol if not present
    const protocol = linkDomain.includes('localhost') ? 'http://' : 'https://';
    const shortUrl = `${protocol}${linkDomain}/${slug}`;
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Handle delete
  const handleDelete = async (slug: string) => {
    if (window.confirm('Are you sure you want to delete this link?')) {
      try {
        await deleteMutation.mutateAsync(slug);
      } catch (error) {
        console.error('Failed to delete link:', error);
      }
    }
  };

  // Handle edit - navigate to create page with link data
  const handleEdit = (link: ShortLink) => {
    navigate('/create', { 
      state: { 
        editMode: true, 
        linkData: link 
      } 
    });
  };

  // Handle view details
  const handleViewDetails = (link: ShortLink) => {
    setSelectedLink(link);
  };

  // Calculate stats
  const totalLinks = links.length;
  const activeLinks = links.filter(link => link.isActive).length;
  const thisMonthLinks = links.filter(link => {
    const linkDate = new Date(link.createdAt);
    const now = new Date();
    return linkDate.getMonth() === now.getMonth() && linkDate.getFullYear() === now.getFullYear();
  }).length;

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load links</h2>
            <p className="text-gray-600 mb-4">There was an error loading your links.</p>
            <button 
              onClick={() => refetch()}
              className="btn btn-primary"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Manage your short links and track their performance.
          </p>
        </div>
        <Link
          to="/create"
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Link
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ExternalLink className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Links</p>
              <p className="text-2xl font-bold text-gray-900">{totalLinks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ExternalLink className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Links</p>
              <p className="text-2xl font-bold text-gray-900">{activeLinks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ExternalLink className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">{thisMonthLinks}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ExternalLink className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clicks</p>
              <p className="text-2xl font-bold text-gray-900">
                {links.reduce((total, link) => total + link.clickCount, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Links</h2>
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12">
              <ExternalLink className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No links yet</h3>
              <p className="text-gray-600 mb-4">Create your first short link to get started.</p>
              <Link to="/create" className="btn btn-primary">
                Create Your First Link
              </Link>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Short Link</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Destination</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Clicks</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link) => (
                  <tr key={link.slug} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {link.domain || 'localhost:8001'}/{link.slug}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          {link.tags && link.tags.length > 0 && (
                            <div className="flex gap-1">
                              {link.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {link.utm_params && Object.keys(link.utm_params).length > 0 && (
                            <span className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded">
                              UTM
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {link.description ? (
                        <p className="text-sm text-gray-600 max-w-xs truncate" title={link.description}>
                          {link.description}
                        </p>
                      ) : (
                        <span className="text-gray-400 text-sm">No description</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm truncate block max-w-xs"
                        title={link.url}
                      >
                        {link.url}
                      </a>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {link.clickCount}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => copyToClipboard(link.slug, link.domain)}
                          className={`p-1 transition-colors ${
                            copiedSlug === link.slug 
                              ? 'text-green-600' 
                              : 'text-gray-400 hover:text-gray-600'
                          }`}
                          title={copiedSlug === link.slug ? 'Copied!' : 'Copy short link'}
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewDetails(link)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(link)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit link"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(link.slug)}
                          disabled={deleteMutation.isPending}
                          className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50"
                          title="Delete link"
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Link Details Modal */}
      {selectedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Link Details</h2>
              <button
                onClick={() => setSelectedLink(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Short Link</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedLink.domain || 'localhost:8001'}/{selectedLink.slug}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                    <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedLink.domain || 'localhost:8001'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                    <a
                      href={selectedLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 bg-gray-50 p-2 rounded block truncate"
                    >
                      {selectedLink.url}
                    </a>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedLink.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedLink.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedLink.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {selectedLink.description}
                  </p>
                </div>
              )}

              {/* Tags */}
              {selectedLink.tags && selectedLink.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedLink.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* UTM Parameters */}
              {selectedLink.utm_params && Object.keys(selectedLink.utm_params).length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">UTM Parameters</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedLink.utm_params).map(([key, value]) => (
                      value && (
                        <div key={key}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {key.replace('utm_', 'UTM ').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </label>
                          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                            {value}
                          </p>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total Clicks</label>
                    <p className="text-2xl font-bold text-gray-900">{selectedLink.clickCount}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedLink.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated</label>
                    <p className="text-sm text-gray-900">
                      {selectedLink.updatedAt 
                        ? new Date(selectedLink.updatedAt).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Expiration */}
              {selectedLink.expiresAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires At</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                    {new Date(selectedLink.expiresAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setSelectedLink(null)}
                className="btn btn-secondary"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSelectedLink(null);
                  handleEdit(selectedLink);
                }}
                className="btn btn-primary"
              >
                Edit Link
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 