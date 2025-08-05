import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Plus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
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

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  const renderArrayField = (
    title: string,
    field: keyof SettingsType,
    description: string,
    placeholder: string
  ) => (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
      </div>
      <div className="card-content">
        <div className="space-y-3">
          {formData[field].map((item, index) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => updateArrayField(field, index, e.target.value)}
                placeholder={placeholder}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => removeArrayItem(field, index)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                title="Remove item"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayItem(field)}
            className="flex items-center text-blue-600 hover:text-blue-800"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add {title.toLowerCase().slice(0, -1)}
          </button>
        </div>
      </div>
    </div>
  );

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

        <div className="flex justify-end space-x-4 pt-6 border-t">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="btn btn-primary flex items-center"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {updateMutation.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-800">
              {updateMutation.error instanceof Error 
                ? updateMutation.error.message 
                : 'Failed to save settings'}
            </span>
          </div>
        )}
      </form>
    </div>
  );
}