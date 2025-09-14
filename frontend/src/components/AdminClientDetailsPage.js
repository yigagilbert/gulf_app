import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Edit, Save, X, User, Mail, Phone, MapPin, Calendar, FileText, Shield, Heart, Briefcase } from 'lucide-react';
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

  // Define which fields to display and their labels - Comprehensive version
  const fieldConfig = {
    // Form Registration Details
    registration: {
      title: "Form Registration Details",
      icon: Shield,
      fields: {
        registration_date: "Date of Registration",
        serial_number: "Serial Number",
        registration_number: "Registration Number"
      }
    },
    // Bio Data (Personal Information)
    personal: {
      title: "BIO DATA (Personal Information)",
      icon: User,
      fields: {
        first_name: "First Name",
        middle_name: "Middle Name", 
        last_name: "Last Name",
        age: "Age",
        gender: "Sex",
        tribe: "Tribe",
        passport_number: "Passport Number",
        contact_1: "Contact 1",
        contact_2: "Contact 2",
        date_of_birth: "Date of Birth",
        place_of_birth: "Place of Birth",
        nin: "NIN Number",
        present_address: "Present Address/Village",
        subcounty: "Subcounty",
        district: "District",
        marital_status: "Marital Status",
        number_of_kids: "Number of Kids",
        height: "Height",
        weight: "Weight",
        position_applied_for: "Position Applied For",
        religion: "Religion",
        nationality: "Nationality"
      }
    },
    // Next of Kin
    nextOfKin: {
      title: "NEXT OF KIN",
      icon: Heart,
      fields: {
        next_of_kin_name: "Name of Next of Kin",
        next_of_kin_contact_1: "Contact 1",
        next_of_kin_contact_2: "Contact 2",
        next_of_kin_address: "Present Address/Village",
        next_of_kin_subcounty: "Subcounty",
        next_of_kin_district: "District",
        next_of_kin_relationship: "Relationship with Next of Kin",
        next_of_kin_age: "Age of Next of Kin"
      }
    },
    // Parent's Details - Father
    father: {
      title: "FATHER'S INFORMATION",
      icon: User,
      fields: {
        father_name: "Father's Name",
        father_contact_1: "Contact 1",
        father_contact_2: "Contact 2",
        father_address: "Present Address/Village",
        father_subcounty: "Subcounty",
        father_district: "District"
      }
    },
    // Parent's Details - Mother
    mother: {
      title: "MOTHER'S INFORMATION",
      icon: User,
      fields: {
        mother_name: "Mother's Name",
        mother_contact_1: "Contact 1",
        mother_contact_2: "Contact 2",
        mother_address: "Present Address/Village",
        mother_subcounty: "Subcounty",
        mother_district: "District"
      }
    },
    // Agent Information
    agent: {
      title: "AGENT INFORMATION",
      icon: User,
      fields: {
        agent_name: "Name of the Agent",
        agent_contact: "Contact 1"
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
      const response = await APIService.uploadClientProfilePhoto(clientId, formData);
      
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
                {client.profile_photo_data ? (
                  <img
                    src={`data:image/jpeg;base64,${client.profile_photo_data}`}
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

            {/* Education Background Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">EDUCATION BACKGROUND</h3>
              </div>
              <div className="text-center text-gray-500 py-8">
                <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Education records will be displayed here</p>
                <p className="text-sm">Feature coming soon</p>
              </div>
            </div>

            {/* Employment Record Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <Briefcase className="h-5 w-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">EMPLOYMENT RECORD</h3>
              </div>
              <div className="text-center text-gray-500 py-8">
                <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p>Employment records will be displayed here</p>
                <p className="text-sm">Feature coming soon</p>
              </div>
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