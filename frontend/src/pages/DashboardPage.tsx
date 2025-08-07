import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ExternalLink, Copy, Edit, Trash2, Loader2, AlertCircle, Eye, X, Search, ChevronLeft, ChevronRight, CopyPlus } from 'lucide-react';
import { linkApi, ShortLink } from '../lib/api';

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<ShortLink | null>(null);
  
  // Pagination and search state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const itemsPerPage = 20;

  // Debounce search term
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch links with pagination and search
  const { 
    data: linksResponse, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['links', currentPage, debouncedSearchTerm],
    queryFn: () => linkApi.getAll({
      page: currentPage,
      limit: itemsPerPage,
      search: debouncedSearchTerm
    }),
  });

  const links = linksResponse?.data || [];
  const pagination = linksResponse?.pagination;

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

  // Handle clone - navigate to create page with link data but without slug
  const handleClone = (link: ShortLink) => {
    const { slug, ...linkDataWithoutSlug } = link;
    navigate('/create', { 
      state: { 
        editMode: false, 
        linkData: linkDataWithoutSlug 
      } 
    });
  };

  // Handle view details
  const handleViewDetails = (link: ShortLink) => {
    setSelectedLink(link);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Calculate stats from current page data (this will be approximate for paginated data)
  const totalLinks = pagination?.total || 0;
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

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search links by slug, URL, description, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Links Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Your Links</h2>
          {searchTerm && (
            <p className="text-sm text-gray-600 mt-1">
              Showing results for "{searchTerm}"
            </p>
          )}
        </div>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-12">
              <ExternalLink className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No links found' : 'No links yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms.' 
                  : 'Create your first short link to get started.'
                }
              </p>
              {!searchTerm && (
                <Link to="/create" className="btn btn-primary">
                  Create Your First Link
                </Link>
              )}
            </div>
          ) : (
            <>
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
                            onClick={() => handleClone(link)}
                            className="p-1 text-gray-400 hover:text-blue-600"
                            title="Clone link"
                          >
                            <CopyPlus className="h-4 w-4" />
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

              {/* Pagination */}
              {pagination && pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                      {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                      {pagination.total} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.page - 1)}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-1 text-sm border rounded-md ${
                                pageNum === pagination.page
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(pagination.page + 1)}
                        disabled={!pagination.hasNext}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Link Details Modal */}
      {selectedLink && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">Link Details</h3>
              <button
                onClick={() => setSelectedLink(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Link</label>
                <p className="text-sm text-gray-900 font-mono bg-gray-50 p-2 rounded">
                  {selectedLink.domain || 'localhost:8001'}/{selectedLink.slug}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Destination URL</label>
                <a
                  href={selectedLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {selectedLink.url}
                </a>
              </div>
              
              {selectedLink.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900">{selectedLink.description}</p>
                </div>
              )}
              
              {selectedLink.tags && selectedLink.tags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {selectedLink.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedLink.utm_params && Object.keys(selectedLink.utm_params).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">UTM Parameters</label>
                  <div className="bg-gray-50 p-3 rounded space-y-1">
                    {Object.entries(selectedLink.utm_params).map(([key, value]) => (
                      <div key={key} className="flex">
                        <span className="text-sm font-medium text-gray-600 w-24">{key}:</span>
                        <span className="text-sm text-gray-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Clicks</label>
                  <p className="text-sm text-gray-900">{selectedLink.clickCount}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                    selectedLink.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {selectedLink.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedLink.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {selectedLink.expiresAt && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedLink.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
                              <button
                  onClick={() => handleClone(selectedLink)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center justify-center"
                >
                  <CopyPlus className="h-4 w-4 mr-2" />
                  Clone Link
                </button>
              <button
                onClick={() => handleEdit(selectedLink)}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Link
              </button>
              <button
                onClick={() => setSelectedLink(null)}
                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 