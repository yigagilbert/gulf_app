import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  // Define which fields to display and their labels
  const fieldConfig = {
    // Personal Information
    personal: {
      title: "Personal Information",
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
      fields: {
        nin: "National ID Number",
        passport_number: "Passport Number",
        passport_expiry: "Passport Expiry"
      }
    },
    // Emergency Contact
    emergency: {
      title: "Emergency Contact",
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