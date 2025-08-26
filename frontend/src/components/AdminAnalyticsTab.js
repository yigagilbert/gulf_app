import React, { useEffect, useState } from 'react';
import APIService from '../services/APIService';

const AdminAnalyticsTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const jobsData = await APIService.getJobs();
      setJobs(jobsData);
    } catch (err) {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  // Simple analytics: total jobs, active jobs, countries
  const totalJobs = jobs.length;
  const activeJobs = jobs.filter(j => j.is_active).length;
  const countries = [...new Set(jobs.map(j => j.country))];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Analytics Dashboard</h2>
      {loading ? (
        <p>Loading analytics...</p>
      ) : error ? (
        <p className="text-red-600">{error}</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-700">{totalJobs}</div>
              <div className="text-gray-700 mt-2">Total Jobs</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-700">{activeJobs}</div>
              <div className="text-gray-700 mt-2">Active Jobs</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-700">{countries.length}</div>
              <div className="text-gray-700 mt-2">Countries</div>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Jobs by Country</h3>
            <ul className="list-disc ml-6">
              {countries.map(country => (
                <li key={country} className="text-gray-700">{country}: {jobs.filter(j => j.country === country).length}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnalyticsTab;