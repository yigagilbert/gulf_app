import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Edit, Save, X, User, Mail, Phone, MapPin, Calendar, FileText, Shield, Heart } from 'lucide-react';
import APIService from '../services/APIService';

const AdminClientDetailsPage = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  // Define which fields to display and their labels
  const fieldConfig = {
    // Personal Information
    personal: {
      title: "Personal Information",
      icon: User,
      fields: {
        first_name: "First Name",
        middle_name: "Middle Name", 
        last_name: "Last Name",
        date_of_birth: "Date of Birth",
        gender: "Gender",
        nationality: "Nationality"
      }
    },
    // Contact Information
    contact: {
      title: "Contact Information",
      icon: Phone,
      fields: {
        phone_primary: "Primary Phone",
        phone_secondary: "Secondary Phone",
        address_current: "Current Address",
        address_permanent: "Permanent Address"
      }
    },
    // Documentation
    documentation: {
      title: "Documentation",
      icon: FileText,
      fields: {
        nin: "National ID Number",
        passport_number: "Passport Number",
        passport_expiry: "Passport Expiry"
      }
    },
    // Emergency Contact
    emergency: {
      title: "Emergency Contact",
      icon: Heart,
      fields: {
        emergency_contact_name: "Contact Name",
        emergency_contact_phone: "Contact Phone",
        emergency_contact_relationship: "Relationship"
      }
    }
  };

  useEffect(() => {
    loadClient();
  }, [clientId]);

  const loadClient = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await APIService.getClientProfile(clientId);
      setClient(data);
      setForm(data);
    } catch (err) {
      setError(err.message || 'Failed to load client details');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await APIService.updateClientProfile(clientId, form);
      setClient(updated);
      setEditMode(false);
    } catch (err) {
      setError(err.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Profile photo must be less than 5MB');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    setPhotoUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await APIService.uploadProfilePhoto(clientId, formData);
      
      // Update both client and form state
      const updatedClient = { ...client, profile_photo_url: response.profile_photo_url };
      setClient(updatedClient);
      setForm(updatedClient);
    } catch (err) {
      setError(err.message || 'Failed to upload profile photo');
    } finally {
      setPhotoUploading(false);
    }
  };

  const formatValue = (value, key) => {
    if (!value) return 'N/A';
    
    // Format dates
    if (key.includes('date') || key.includes('_at')) {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch {
        return value;
      }
    }
    
    // Format status
    if (key === 'status') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    
    return value.toString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'new': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'verified': return 'bg-green-100 text-green-800 border-green-200';
      case 'traveled': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'returned': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );
  
  if (error && !client) return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800">{error}</div>
        <button 
          onClick={() => navigate(-1)}
          className="mt-3 text-red-600 hover:text-red-800 underline"
        >
          Go Back
        </button>
      </div>
    </div>
  );
  
  if (!client) return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-gray-600">Client not found.</div>
        <button 
          onClick={() => navigate(-1)}
          className="mt-3 text-gray-600 hover:text-gray-800 underline"
        >
          Go Back
        </button>
      </div>
    </div>
  );

  const clientName = [client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed Client';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <button 
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Clients
          </button>
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
          <div className="text-center">
            {/* Profile Photo */}
            <div className="relative inline-block mb-6">
              <div className="relative">
                {client.profile_photo_url ? (
                  <img
                    src={client.profile_photo_url}
                    alt={clientName}
                    className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-lg object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-white shadow-lg bg-white flex items-center justify-center">
                    <span className="text-4xl sm:text-5xl font-bold text-gray-600">
                      {getInitials(clientName)}
                    </span>
                  </div>
                )}
                
                {/* Photo Upload Button */}
                <div className="absolute bottom-2 right-2">
                  <label className="relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={photoUploading}
                    />
                    <div className={`w-10 h-10 bg-indigo-600 hover:bg-indigo-700 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                      photoUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}>
                      {photoUploading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      ) : (
                        <Camera className="h-5 w-5 text-white" />
                      )}
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Client Name */}
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">{clientName}</h1>
            
            {/* Email */}
            {client.user_email && (
              <p className="text-lg opacity-90 mb-4 flex items-center justify-center">
                <Mail className="h-5 w-5 mr-2" />
                {client.user_email}
              </p>
            )}

            {/* Status Badge */}
            <div className="inline-flex items-center">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(client.status)} bg-white`}>
                {formatValue(client.status, 'status')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {editMode ? (
          /* Edit Mode */
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Edit Client Details</h2>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditMode(false);
                    setForm(client);
                    setError(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  <X className="h-4 w-4 mr-2 inline" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                    saving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2 inline" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </div>

            <form className="space-y-8">
              {Object.entries(fieldConfig).map(([sectionKey, section]) => (
                <div key={sectionKey} className="border-b border-gray-200 pb-6 last:border-b-0">
                  <div className="flex items-center mb-4">
                    <section.icon className="h-5 w-5 text-indigo-600 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">{section.title}</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(section.fields).map(([fieldKey, label]) => (
                      <div key={fieldKey}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {label}
                        </label>
                        <input
                          type={fieldKey.includes('date') ? 'date' : fieldKey.includes('phone') ? 'tel' : 'text'}
                          name={fieldKey}
                          value={form[fieldKey] || ''}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </form>
          </div>
        ) : (
          /* View Mode */
          <div className="space-y-6">
            {/* Edit Button */}
            <div className="flex justify-end">
              <button
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors font-medium"
                onClick={() => setEditMode(true)}
              >
                <Edit className="h-4 w-4 mr-2 inline" />
                Edit Details
              </button>
            </div>

            {/* Information Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(fieldConfig).map(([sectionKey, section]) => (
                <div key={sectionKey} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                      <section.icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(section.fields).map(([fieldKey, label]) => (
                      <div key={fieldKey} className="flex justify-between items-start">
                        <span className="text-sm font-medium text-gray-600 flex-shrink-0 w-1/3">
                          {label}:
                        </span>
                        <span className="text-sm text-gray-900 text-right flex-1">
                          {formatValue(client[fieldKey], fieldKey)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">System Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Client ID:</span>
                  <span className="text-sm text-gray-900 font-mono">{client.id}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Created:</span>
                  <span className="text-sm text-gray-900">{formatValue(client.created_at, 'created_at')}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Last Updated:</span>
                  <span className="text-sm text-gray-900">{formatValue(client.updated_at, 'updated_at')}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                    {formatValue(client.status, 'status')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminClientDetailsPage;
      fields: {
        emergency_contact_name: "Name",
        emergency_contact_phone: "Phone",
        emergency_contact_relationship: "Relationship"
      }
    },
    // Verification & Status
    verification: {
      title: "Verification & Status",
      fields: {
        status: "Status",
        verified_by: "Verified By",
        verified_at: "Verified At",
        verification_notes: "Verification Notes"
      }
    }
  };

  // System fields (readonly, displayed separately)
  const systemFields = {
    id: "Client ID",
    user_id: "User ID", 
    created_at: "Created At",
    updated_at: "Last Updated",
    last_modified_by: "Last Modified By"
  };

  useEffect(() => {
    const fetchClient = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await APIService.getClientProfile(clientId);
        setClient(data);
        setForm(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch client details');
      } finally {
        setLoading(false);
      }
    };
    fetchClient();
  }, [clientId]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await APIService.updateClientProfile(clientId, form);
      setClient(updated);
      setEditMode(false);
    } catch (err) {
      setError(err.message || 'Failed to update client');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Upload to backend
    const formData = new FormData();
    formData.append('file', file);
    const response = await APIService.uploadProfilePhoto(clientId, formData);
    setForm({ ...form, profile_photo_url: response.profile_photo_url });
  };

  const formatValue = (value, key) => {
    if (!value) return 'N/A';
    
    // Format dates
    if (key.includes('date') || key.includes('_at')) {
      try {
        return new Date(value).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch {
        return value;
      }
    }
    
    // Format status
    if (key === 'status') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    
    return value.toString();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'verified': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'new': return 'bg-gray-100 text-gray-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
  
  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="text-red-800">{error}</div>
    </div>
  );
  
  if (!client) return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="text-gray-600">Client not found.</div>
    </div>
  );

  const clientName = [client.first_name, client.middle_name, client.last_name]
    .filter(Boolean)
    .join(' ') || 'Unnamed Client';

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button 
          className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
          onClick={() => navigate(-1)}
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Clients
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
            />
            <h1 className="text-3xl font-bold text-gray-900">{clientName}</h1>
            <div className="flex items-center mt-2 space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(client.status)}`}>
                {formatValue(client.status, 'status')}
              </span>
              {client.profile_photo_url && (
                <img 
                  src={client.profile_photo_url} 
                  alt="Profile"
                  className="w-12 h-12 rounded-full border-2 border-gray-200"
                />
              )}
            </div>
          </div>
          
          {!editMode && (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              onClick={() => setEditMode(true)}
            >
              Edit Details
            </button>
          )}
        </div>
      </div>

      {editMode ? (
        /* Edit Mode */
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-6 text-gray-900">Edit Client Details</h2>
          <form className="space-y-8">
            {Object.entries(fieldConfig).map(([sectionKey, section]) => (
              <div key={sectionKey} className="border-b border-gray-200 pb-6 last:border-b-0">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{section.title}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(section.fields).map(([fieldKey, label]) => (
                    <div key={fieldKey}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {label}
                      </label>
                      <input
                        type={fieldKey.includes('date') ? 'date' : fieldKey.includes('phone') ? 'tel' : 'text'}
                        name={fieldKey}
                        value={form[fieldKey] || ''}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="flex justify-end space-x-4 pt-6 border-t">
              <button
                type="button"
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                onClick={() => setEditMode(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg disabled:opacity-50 transition-colors"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* View Mode */
        <div className="space-y-6">
          {Object.entries(fieldConfig).map(([sectionKey, section]) => (
            <div key={sectionKey} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{section.title}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(section.fields).map(([fieldKey, label]) => (
                  <div key={fieldKey} className="border-b border-gray-100 pb-2">
                    <dt className="text-sm font-medium text-gray-500">{label}</dt>
                    <dd className="text-sm text-gray-900 mt-1">
                      {formatValue(client[fieldKey], fieldKey)}
                    </dd>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* System Information */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(systemFields).map(([fieldKey, label]) => (
                <div key={fieldKey} className="border-b border-gray-200 pb-2">
                  <dt className="text-sm font-medium text-gray-500">{label}</dt>
                  <dd className="text-xs text-gray-700 mt-1 font-mono">
                    {formatValue(client[fieldKey], fieldKey)}
                  </dd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientDetailsPage;