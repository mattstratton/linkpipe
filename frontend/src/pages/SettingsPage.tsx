import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Save, Plus, Trash2, Loader2, AlertCircle, CheckCircle, Upload, List, Grid, Star, StarOff } from 'lucide-react';
import { settingsApi, domainsApi, Settings as SettingsType, Domain } from '../lib/api';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Bulk mode state for each field
  const [bulkModeStates, setBulkModeStates] = useState<Record<string, boolean>>({});
  const [bulkTextStates, setBulkTextStates] = useState<Record<string, string>>({});

  // Fetch settings and domains
  const { 
    data: settings, 
    isLoading: settingsLoading, 
    error: settingsError,
  } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  });

  const {
    data: domains,
    isLoading: domainsLoading,
    error: domainsError,
  } = useQuery({
    queryKey: ['domains'],
    queryFn: domainsApi.getAll,
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: settingsApi.updateAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Domain mutations
  const createDomainMutation = useMutation({
    mutationFn: ({ name, isDefault }: { name: string; isDefault: boolean }) => 
      domainsApi.create(name, isDefault),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setSuccessMessage('Domain added successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const updateDomainMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; isDefault?: boolean } }) =>
      domainsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setSuccessMessage('Domain updated successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: domainsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setSuccessMessage('Domain deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  const setDefaultDomainMutation = useMutation({
    mutationFn: domainsApi.setDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      setSuccessMessage('Default domain set successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
  });

  // Local state for form data
  const [formData, setFormData] = useState<SettingsType>({
    utm_sources: [],
    utm_mediums: [],
    utm_campaigns: [],
    utm_contents: [],
  });

  // Domain form state
  const [newDomain, setNewDomain] = useState({ name: '', isDefault: false });
  const [editingDomain, setEditingDomain] = useState<Domain | null>(null);

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

  // Toggle bulk mode for a field
  const toggleBulkMode = (field: string) => {
    setBulkModeStates(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  // Update bulk text for a field
  const updateBulkText = (field: string, text: string) => {
    setBulkTextStates(prev => ({
      ...prev,
      [field]: text
    }));
  };

  // Handle bulk import for a field
  const handleBulkImportForField = (field: keyof SettingsType) => {
    const bulkText = bulkTextStates[field] || '';
    handleBulkImport(field, bulkText);
    updateBulkText(field, '');
  };

  // Load current items into bulk text
  const loadCurrentItems = (field: keyof SettingsType) => {
    const currentItems = formData[field].join('\n');
    updateBulkText(field, currentItems);
  };

  const handleSettingsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty strings and sort alphabetically
    const cleanedData: SettingsType = {
      utm_sources: formData.utm_sources.filter(s => s.trim() !== '').sort(),
      utm_mediums: formData.utm_mediums.filter(m => m.trim() !== '').sort(),
      utm_campaigns: formData.utm_campaigns.filter(c => c.trim() !== '').sort(),
      utm_contents: formData.utm_contents.filter(c => c.trim() !== '').sort(),
    };
    
    updateSettingsMutation.mutate(cleanedData);
  };

  const handleAddDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDomain.name.trim()) {
      createDomainMutation.mutate({
        name: newDomain.name.trim(),
        isDefault: newDomain.isDefault,
      });
      setNewDomain({ name: '', isDefault: false });
    }
  };

  const handleUpdateDomain = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDomain && editingDomain.name.trim()) {
      updateDomainMutation.mutate({
        id: editingDomain.id,
        data: {
          name: editingDomain.name.trim(),
          isDefault: editingDomain.isDefault,
        },
      });
      setEditingDomain(null);
    }
  };

  const handleSetDefaultDomain = (domain: Domain) => {
    if (!domain.isDefault) {
      setDefaultDomainMutation.mutate(domain.id);
    }
  };

  const handleDeleteDomain = (domain: Domain) => {
    if (window.confirm(`Are you sure you want to delete the domain "${domain.name}"?`)) {
      deleteDomainMutation.mutate(domain.id);
    }
  };

  if (settingsError || domainsError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Settings</h2>
            <p className="text-gray-600">
              {settingsError?.message || domainsError?.message || 'Failed to load settings'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (settingsLoading || domainsLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your domains and UTM parameters</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
          <span className="text-green-800">{successMessage}</span>
        </div>
      )}

      {/* Domains Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2" />
          Domains
        </h2>
        
        {/* Add New Domain */}
        <form onSubmit={handleAddDomain} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Enter domain name (e.g., example.com)"
                value={newDomain.name}
                onChange={(e) => setNewDomain(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newDomain.isDefault}
                onChange={(e) => setNewDomain(prev => ({ ...prev, isDefault: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-600">Set as default</span>
            </label>
            <button
              type="submit"
              disabled={!newDomain.name.trim() || createDomainMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {createDomainMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Add Domain
            </button>
          </div>
        </form>

        {/* Domains List */}
        <div className="space-y-3">
          {domains?.map((domain) => (
            <div key={domain.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {domain.isDefault ? (
                  <Star className="h-5 w-5 text-yellow-500" />
                ) : (
                  <StarOff className="h-5 w-5 text-gray-400" />
                )}
                <span className="font-medium">{domain.name}</span>
                {domain.isDefault && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full">
                    Default
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!domain.isDefault && (
                  <button
                    onClick={() => handleSetDefaultDomain(domain)}
                    disabled={setDefaultDomainMutation.isPending}
                    className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-md"
                    title="Set as default"
                  >
                    <Star className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={() => setEditingDomain(domain)}
                  className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                  title="Edit domain"
                >
                  <Settings className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteDomain(domain)}
                  disabled={deleteDomainMutation.isPending}
                  className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md"
                  title="Delete domain"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          
          {domains?.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No domains configured yet.</p>
              <p className="text-sm">Add your first domain above.</p>
            </div>
          )}
        </div>
      </div>

      {/* UTM Settings Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">UTM Parameters</h2>
        
        <form onSubmit={handleSettingsSubmit}>
          {renderArrayField(
            'UTM Sources',
            'utm_sources',
            'Predefined UTM source values for your links',
            'Enter UTM source (e.g., newsletter, social)'
          )}
          
          {renderArrayField(
            'UTM Mediums',
            'utm_mediums',
            'Predefined UTM medium values for your links',
            'Enter UTM medium (e.g., email, cpc)'
          )}
          
          {renderArrayField(
            'UTM Campaigns',
            'utm_campaigns',
            'Predefined UTM campaign values for your links',
            'Enter UTM campaign (e.g., spring_sale)'
          )}
          
          {renderArrayField(
            'UTM Contents',
            'utm_contents',
            'Predefined UTM content values for your links',
            'Enter UTM content (e.g., header_link)'
          )}
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={updateSettingsMutation.isPending}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </button>
          </div>
        </form>
      </div>

      {/* Edit Domain Modal */}
      {editingDomain && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Edit Domain</h3>
            <form onSubmit={handleUpdateDomain}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={editingDomain.name}
                  onChange={(e) => setEditingDomain(prev => prev ? { ...prev, name: e.target.value } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingDomain.isDefault}
                    onChange={(e) => setEditingDomain(prev => prev ? { ...prev, isDefault: e.target.checked } : null)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-600">Set as default</span>
                </label>
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={!editingDomain.name.trim() || updateDomainMutation.isPending}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateDomainMutation.isPending ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingDomain(null)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );

  function renderArrayField(
    title: string,
    field: keyof SettingsType,
    description: string,
    placeholder: string
  ) {
    const isBulkMode = bulkModeStates[field] || false;
    const bulkText = bulkTextStates[field] || '';

    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <button
            type="button"
            onClick={() => toggleBulkMode(field)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            {isBulkMode ? <List className="h-4 w-4 mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
            {isBulkMode ? 'Single Mode' : 'Bulk Import'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">{description}</p>

        {isBulkMode ? (
          <div className="space-y-3">
            <textarea
              value={bulkText}
              onChange={(e) => updateBulkText(field, e.target.value)}
              placeholder={`Enter ${title.toLowerCase()} separated by lines\nExample:\nitem1\nitem2\nitem3`}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleBulkImportForField(field)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Import {title}
              </button>
              <button
                type="button"
                onClick={() => loadCurrentItems(field)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Load Current
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {formData[field].map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => updateArrayField(field, index, e.target.value)}
                  placeholder={placeholder}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => removeArrayItem(field, index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => addArrayItem(field)}
              className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-md border border-blue-200 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {title.slice(0, -1)}
            </button>
          </div>
        )}

        {/* Display current items as tags */}
        {formData[field].length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Current {title}:</p>
            <div className="flex flex-wrap gap-2">
              {formData[field]
                .filter(item => item.trim() !== '')
                .sort()
                .map((item, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                  >
                    {item}
                  </span>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }
}