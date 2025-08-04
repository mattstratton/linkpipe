import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, ExternalLink, Copy, Edit, Trash2 } from 'lucide-react';

export default function DashboardPage() {
  // Mock data for now - will be replaced with real API calls
  const mockLinks = [
    {
      slug: 'spring-sale',
      url: 'https://example.com/spring-sale-2024',
      utm_params: {
        utm_source: 'newsletter',
        utm_medium: 'email',
        utm_campaign: 'spring_sale_2024'
      },
      createdAt: '2024-01-15T10:30:00Z',
      tags: ['marketing', 'sale'],
      description: 'Spring sale campaign email link',
      isActive: true
    },
    {
      slug: 'product-launch',
      url: 'https://example.com/new-product',
      utm_params: {
        utm_source: 'social',
        utm_medium: 'facebook',
        utm_campaign: 'product_launch'
      },
      createdAt: '2024-01-10T14:20:00Z',
      tags: ['social', 'launch'],
      description: 'New product announcement for social media',
      isActive: true
    }
  ];

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

      {/* Stats Cards */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Links</p>
                <p className="text-2xl font-bold text-gray-900">{mockLinks.length}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <ExternalLink className="h-6 w-6 text-primary-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Links</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockLinks.filter(link => link.isActive).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Plus className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-content">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">This Month</p>
                <p className="text-2xl font-bold text-gray-900">12</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Copy className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Links Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold">Your Links</h2>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Short Link</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Destination</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">UTM Parameters</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockLinks.map((link) => (
                  <tr key={link.slug} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">/{link.slug}</p>
                        {link.description && (
                          <p className="text-sm text-gray-500">{link.description}</p>
                        )}
                        {link.tags && link.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
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
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm truncate block max-w-xs"
                      >
                        {link.url}
                      </a>
                    </td>
                    <td className="py-3 px-4">
                      {link.utm_params && Object.keys(link.utm_params).length > 0 ? (
                        <div className="text-sm text-gray-600">
                          {Object.entries(link.utm_params).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {value}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(link.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Copy short link"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-gray-600"
                          title="Edit link"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="p-1 text-gray-400 hover:text-red-600"
                          title="Delete link"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 