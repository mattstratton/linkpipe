import React from 'react';
import { Link } from 'react-router-dom';
import { Plus, Link as LinkIcon, BarChart3 } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Professional URL Shortener with UTM Management
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create short, memorable links with powerful UTM parameter management. 
          Perfect for marketing campaigns, social media, and analytics tracking.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/create"
            className="btn btn-primary px-8 py-3 text-lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Short Link
          </Link>
          <Link
            to="/dashboard"
            className="btn btn-outline px-8 py-3 text-lg"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            View Dashboard
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-3 gap-8 py-12">
        <div className="card">
          <div className="card-header">
            <LinkIcon className="h-8 w-8 text-primary-600 mb-2" />
            <h3 className="text-lg font-semibold">URL Shortening</h3>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              Create short, memorable links with custom or auto-generated slugs. 
              Perfect for sharing on social media or print materials.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <BarChart3 className="h-8 w-8 text-primary-600 mb-2" />
            <h3 className="text-lg font-semibold">UTM Management</h3>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              Add and manage UTM parameters with predefined options or custom values. 
              Track your marketing campaigns effectively.
            </p>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <Plus className="h-8 w-8 text-primary-600 mb-2" />
            <h3 className="text-lg font-semibold">Easy Management</h3>
          </div>
          <div className="card-content">
            <p className="text-gray-600">
              Organize links with tags, descriptions, and expiration dates. 
              Bulk import/export and comprehensive dashboard included.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Start Section */}
      <div className="bg-gray-50 rounded-lg p-8 my-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
          Get Started in Seconds
        </h2>
        <div className="grid md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              1
            </div>
            <h4 className="font-medium mb-1">Enter Your URL</h4>
            <p className="text-sm text-gray-600">Paste any long URL you want to shorten</p>
          </div>
          <div>
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              2
            </div>
            <h4 className="font-medium mb-1">Add UTM Parameters</h4>
            <p className="text-sm text-gray-600">Configure tracking parameters for your campaigns</p>
          </div>
          <div>
            <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 font-bold">
              3
            </div>
            <h4 className="font-medium mb-1">Share & Track</h4>
            <p className="text-sm text-gray-600">Get your short link and start tracking results</p>
          </div>
        </div>
        <div className="text-center mt-6">
          <Link
            to="/create"
            className="btn btn-primary"
          >
            Create Your First Link
          </Link>
        </div>
      </div>
    </div>
  );
} 