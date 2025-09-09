import { useState, useEffect } from 'react';
import APIService from '../services/APIService';
import { validateProfileData } from '../utils/validation';  // Imported to replace inline validation
import { VALIDATION_RULES } from '../constants';  // For consistent rules

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Use exported validation
    const validation = validateProfileData(formData);
    // if (!validation.isValid) {
    //   setError(validation.errors[0]);
    //   setLoading(false);
    //   return;
    // }

    try {
      const updatedProfile = await APIService.updateProfile(formData);
      onUpdate(updatedProfile);
      setIsEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Middle Name</label>
              <input
                type="text"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nationality</label>
              <input
                type="text"
                name="nationality"
                value={formData.nationality}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {/* Additional fields inferred from truncation: nin, passport, phones, addresses, emergency */}
            <div>
              <label className="block text-sm font-medium text-gray-700">NIN</label>
              <input
                type="text"
                name="nin"
                value={formData.nin}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Passport Number</label>
              <input
                type="text"
                name="passport_number"
                value={formData.passport_number}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Passport Expiry</label>
              <input
                type="date"
                name="passport_expiry"
                value={formData.passport_expiry}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Primary Phone</label>
              <input
                type="tel"
                name="phone_primary"
                value={formData.phone_primary}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Secondary Phone</label>
              <input
                type="tel"
                name="phone_secondary"
                value={formData.phone_secondary}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Current Address</label>
              <textarea
                name="address_current"
                value={formData.address_current}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">Permanent Address</label>
              <textarea
                name="address_permanent"
                value={formData.address_permanent}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Name</label>
              <input
                type="text"
                name="emergency_contact_name"
                value={formData.emergency_contact_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Phone</label>
              <input
                type="tel"
                name="emergency_contact_phone"
                value={formData.emergency_contact_phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Emergency Contact Relationship</label>
              <input
                type="text"
                name="emergency_contact_relationship"
                value={formData.emergency_contact_relationship}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
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
          {/* Additional non-editable fields if needed */}
        </div>
      )}
      {!isEditing && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={() => setIsEditing(true)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Edit Profile
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileTab;