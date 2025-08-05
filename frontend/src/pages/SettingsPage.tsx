import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Plus, Trash2, Loader2, AlertCircle, CheckCircle, Upload, List, Grid } from 'lucide-react';
import { settingsApi, Settings as SettingsType } from '../lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch settings
  const { 
    data: settings, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: settingsApi.updateAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Local state for form data
  const [formData, setFormData] = useState<SettingsType>({
    domains: [],
    utm_sources: [],
    utm_mediums: [],
    utm_campaigns: [],
    utm_contents: [],
  });

  // Update form data when settings load
  React.useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Handle array field updates
  const updateArrayField = (field: keyof SettingsType, index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addArrayItem = (field: keyof SettingsType) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const removeArrayItem = (field: keyof SettingsType, index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  // Bulk import functionality
  const handleBulkImport = (field: keyof SettingsType, bulkText: string) => {
    const items = bulkText
      .split('\n')
      .map(item => item.trim())
      .filter(item => item.length > 0);
    
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ...items]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty strings
    const cleanedData: SettingsType = {
      domains: formData.domains.filter(d => d.trim() !== ''),
      utm_sources: formData.utm_sources.filter(s => s.trim() !== ''),
      utm_mediums: formData.utm_mediums.filter(m => m.trim() !== ''),
      utm_campaigns: formData.utm_campaigns.filter(c => c.trim() !== ''),
      utm_contents: formData.utm_contents.filter(c => c.trim() !== ''),
    };
    
    updateMutation.mutate(cleanedData);
  };

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to load settings</h2>
            <p className="text-gray-600 mb-4">There was an error loading the settings.</p>
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

  const renderArrayField = (
    title: string,
    field: keyof SettingsType,
    description: string,
    placeholder: string
  ) => {
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkText, setBulkText] = useState('');

    return (
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-600 mt-1">{description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsBulkMode(false)}
                className={`p-2 rounded-md transition-colors ${
                  !isBulkMode 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Single item mode"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsBulkMode(true)}
                className={`p-2 rounded-md transition-colors ${
                  isBulkMode 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title="Bulk import mode"
              >
                <Upload className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div className="p-6">
          {isBulkMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paste multiple {title.toLowerCase()} (one per line)
                </label>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`Enter ${title.toLowerCase()}, one per line:
example1
example2
example3`}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    handleBulkImport(field, bulkText);
                    setBulkText('');
                  }}
                  className="btn btn-primary"
                  disabled={!bulkText.trim()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Import {title}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBulkText(formData[field].join('\n'));
                  }}
                  className="btn btn-secondary"
                >
                  Load Current
                </button>
              </div>
              {formData[field].length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Current {title} ({formData[field].length} items)
                  </p>
                  <div className="bg-gray-50 rounded-md p-3 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-2">
                      {formData[field].map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => removeArrayItem(field, index)}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {formData[field].map((item, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateArrayField(field, index, e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeArrayItem(field, index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addArrayItem(field)}
                className="flex items-center text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add {title.toLowerCase().slice(0, -1)}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Settings className="h-8 w-8 mr-3" />
            Settings
          </h1>
          <p className="text-gray-600 mt-2">
            Configure domains and UTM parameter options for your short links.
          </p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {renderArrayField(
          'Domains',
          'domains',
          'Available domains for your short links. Include port if needed (e.g., localhost:8001)',
          'example.com or localhost:8001'
        )}

        {renderArrayField(
          'UTM Sources',
          'utm_sources',
          'Predefined options for UTM source parameter',
          'newsletter, social, website, etc.'
        )}

        {renderArrayField(
          'UTM Mediums',
          'utm_mediums',
          'Predefined options for UTM medium parameter',
          'email, social, cpc, etc.'
        )}

        {renderArrayField(
          'UTM Campaigns',
          'utm_campaigns',
          'Predefined options for UTM campaign parameter',
          'spring_sale, product_launch, etc.'
        )}

        {renderArrayField(
          'UTM Contents',
          'utm_contents',
          'Predefined options for UTM content parameter',
          'header_link, main_cta, etc.'
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}