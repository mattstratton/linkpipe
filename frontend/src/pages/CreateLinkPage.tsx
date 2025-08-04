import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function CreateLinkPage() {
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

      <div className="card">
        <div className="card-content">
          <form className="space-y-6">
            {/* URL Input */}
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                URL to shorten *
              </label>
              <input
                type="url"
                id="url"
                name="url"
                placeholder="https://example.com/your-long-url"
                className="input"
                required
              />
            </div>

            {/* Custom Slug */}
            <div>
              <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
                Custom slug (optional)
              </label>
              <div className="flex items-center">
                <span className="text-gray-500 text-sm mr-2">go.yourdomain.com/</span>
                <input
                  type="text"
                  id="slug"
                  name="slug"
                  placeholder="my-custom-link"
                  className="input flex-1"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Leave blank to generate automatically
              </p>
            </div>

            {/* UTM Parameters */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">UTM Parameters</h3>
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="utm_source" className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Source
                  </label>
                  <input
                    type="text"
                    id="utm_source"
                    name="utm_source"
                    placeholder="newsletter"
                    className="input"
                  />
                </div>
                
                <div>
                  <label htmlFor="utm_medium" className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Medium
                  </label>
                  <input
                    type="text"
                    id="utm_medium"
                    name="utm_medium"
                    placeholder="email"
                    className="input"
                  />
                </div>
                
                <div>
                  <label htmlFor="utm_campaign" className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Campaign
                  </label>
                  <input
                    type="text"
                    id="utm_campaign"
                    name="utm_campaign"
                    placeholder="spring_sale"
                    className="input"
                  />
                </div>
                
                <div>
                  <label htmlFor="utm_term" className="block text-sm font-medium text-gray-700 mb-2">
                    UTM Term
                  </label>
                  <input
                    type="text"
                    id="utm_term"
                    name="utm_term"
                    placeholder="running shoes"
                    className="input"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label htmlFor="utm_content" className="block text-sm font-medium text-gray-700 mb-2">
                  UTM Content
                </label>
                <input
                  type="text"
                  id="utm_content"
                  name="utm_content"
                  placeholder="header_link"
                  className="input"
                />
              </div>
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
                  rows={3}
                  placeholder="A brief description of this link..."
                  className="input"
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
                  placeholder="marketing, campaign, email"
                  className="input"
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
                className="btn btn-primary flex-1"
              >
                Create Short Link
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
  );
} 