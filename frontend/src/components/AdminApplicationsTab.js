import React, { useEffect, useState } from 'react';
import APIService from '../services/APIService';

const AdminApplicationsTab = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await APIService.getAllApplications();
        setApplications(data);
      } catch (err) {
        setError(err.message || 'Failed to fetch applications');
      } finally {
        setLoading(false);
      }
    };
    fetchApplications();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">All Job Applications</h2>
      {loading ? (
        <p className="text-gray-500">Loading applications...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : applications.length === 0 ? (
        <p className="text-gray-500">No job applications found.</p>
      ) : (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-900">{app.job?.title || app.job_id}</span>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">{app.application_status}</span>
              </div>
              <div className="text-gray-600 text-sm">Applied: {new Date(app.applied_date).toLocaleDateString()}</div>
              <div className="text-gray-600 text-sm">Client ID: {app.client_id}</div>
              {app.notes && <div className="text-gray-700 text-sm mt-2">Notes: {app.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminApplicationsTab;