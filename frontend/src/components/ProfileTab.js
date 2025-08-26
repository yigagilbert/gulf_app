import { useState, useEffect } from 'react';
import APIService from '../services/APIService';

const ProfileTab = ({ profile, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    first_name: '',
    middle_name: '',
    last_name: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    nin: '',
    passport_number: '',
    passport_expiry: '',
    phone_primary: '',
    phone_secondary: '',
    address_current: '',
    address_permanent: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: ''
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        middle_name: profile.middle_name || '',
        last_name: profile.last_name || '',
        date_of_birth: profile.date_of_birth || '',
        gender: profile.gender || '',
        nationality: profile.nationality || '',
        nin: profile.nin || '',
        passport_number: profile.passport_number || '',
        passport_expiry: profile.passport_expiry || '',
        phone_primary: profile.phone_primary || '',
        phone_secondary: profile.phone_secondary || '',
        address_current: profile.address_current || '',
        address_permanent: profile.address_permanent || '',
        emergency_contact_name: profile.emergency_contact_name || '',
        emergency_contact_phone: profile.emergency_contact_phone || '',
        emergency_contact_relationship: profile.emergency_contact_relationship || ''
      });
    }
  }, [profile]);


  // Validate form data before submitting
  const validateForm = () => {
    const errors = [];
    // Required fields (based on backend ClientProfileUpdate schema)
    if (!formData.first_name || formData.first_name.trim().length < 2) {
      errors.push('First name is required and must be at least 2 characters.');
    }
    if (!formData.last_name || formData.last_name.trim().length < 2) {
      errors.push('Last name is required and must be at least 2 characters.');
    }
    // Date format validation (YYYY-MM-DD)
    if (formData.date_of_birth && !/^\d{4}-\d{2}-\d{2}$/.test(formData.date_of_birth)) {
      errors.push('Date of birth must be in YYYY-MM-DD format.');
    }
    // Passport expiry format
    if (formData.passport_expiry && !/^\d{4}-\d{2}-\d{2}$/.test(formData.passport_expiry)) {
      errors.push('Passport expiry must be in YYYY-MM-DD format.');
    }
    // Phone number basic validation
    if (formData.phone_primary && !/^\+?\d{7,15}$/.test(formData.phone_primary)) {
      errors.push('Primary phone number must be valid.');
    }
    // NIN basic validation
    if (formData.nin && formData.nin.length < 5) {
      errors.push('NIN must be at least 5 characters.');
    }
    // Passport number basic validation
    if (formData.passport_number && formData.passport_number.length < 5) {
      errors.push('Passport number must be at least 5 characters.');
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      setLoading(false);
      return;
    }

    try {
      await APIService.updateProfile(formData);
      setIsEditing(false);
      await onUpdate(); // Refresh data after successful update
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      placed: 'bg-purple-100 text-purple-800',
      traveled: 'bg-indigo-100 text-indigo-800',
      inactive: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.new;
  };

  // Add error display and loading state to the form
  const renderForm = () => (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      
      {/* Your existing form fields */}
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <div className="mt-2">
            <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(profile?.status)}`}>
              {profile?.status?.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
                </div>
            )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date of Birth
              </label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                NIN
              </label>
              <input
                type="text"
                value={formData.nin}
                onChange={(e) => setFormData({ ...formData, nin: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Passport Number
              </label>
              <input
                type="text"
                value={formData.passport_number}
                onChange={(e) => setFormData({ ...formData, passport_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phone_primary}
                onChange={(e) => setFormData({ ...formData, phone_primary: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nationality
              </label>
              <input
                type="text"
                value={formData.nationality}
                onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
            <div className="flex justify-end">
                <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Full Name</label>
              <p className="text-gray-900">
                {profile?.first_name} {profile?.middle_name} {profile?.last_name}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Email</label>
              <p className="text-gray-900">{profile?.user?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Phone</label>
              <p className="text-gray-900">{profile?.phone_primary || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">NIN</label>
              <p className="text-gray-900">{profile?.nin || 'Not provided'}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-500">Date of Birth</label>
              <p className="text-gray-900">{profile?.date_of_birth || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Nationality</label>
              <p className="text-gray-900">{profile?.nationality || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Passport Number</label>
              <p className="text-gray-900">{profile?.passport_number || 'Not provided'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500">Account Created</label>
              <p className="text-gray-900">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;
