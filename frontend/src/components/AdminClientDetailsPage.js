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

  if (loading) return <div className="p-6">Loading client details...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!client) return <div className="p-6">Client not found.</div>;

  return (
    <div className="bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
      <button className="mb-4 text-blue-600" onClick={() => navigate(-1)}>&larr; Back to Clients</button>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Details</h2>
      <div className="mb-2 text-sm text-gray-500">Last modified by: {client.last_modified_by || 'N/A'}</div>
      {editMode ? (
        <form className="space-y-4">
          {Object.entries(form).map(([key, value]) => (
            <div key={key}>
              <label className="block text-gray-700 text-sm font-medium mb-1">{key}</label>
              <input
                name={key}
                value={value || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          ))}
          <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button type="button" className="ml-2 px-4 py-2 rounded-lg border" onClick={() => setEditMode(false)}>
            Cancel
          </button>
        </form>
      ) : (
        <div className="space-y-2">
          {Object.entries(client).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="font-medium text-gray-700">{key}</span>
              <span className="text-gray-900">{value?.toString() || ''}</span>
            </div>
          ))}
          <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg" onClick={() => setEditMode(true)}>
            Edit Details
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminClientDetailsPage;
