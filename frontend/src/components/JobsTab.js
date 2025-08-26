import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
import APIService from '../services/APIService';

const JobsTab = ({ jobs }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [applyingId, setApplyingId] = useState(null);
  const [applySuccess, setApplySuccess] = useState(null);
  const [applyError, setApplyError] = useState(null);

  const countries = [...new Set(jobs.map(job => job.country))];
  
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = !filterCountry || job.country === filterCountry;
    return matchesSearch && matchesCountry && job.is_active;
  });

  // Handle job application
  const handleApply = async (jobId) => {
    setApplyingId(jobId);
    setApplySuccess(null);
    setApplyError(null);
    try {
      await APIService.applyForJob(jobId);
      setApplySuccess('Application submitted successfully!');
    } catch (err) {
      setApplyError(err.message || 'Failed to apply for job');
    } finally {
      setApplyingId(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Opportunities</h2>

      {/* Search and Filter */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search jobs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Countries</option>
          {countries.map(country => (
            <option key={country} value={country}>{country}</option>
          ))}
        </select>
      </div>

      {/* Feedback */}
      {applySuccess && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg mb-4">{applySuccess}</div>}
      {applyError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4">{applyError}</div>}

      {/* Job List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No jobs found matching your criteria.</p>
        ) : (
          filteredJobs.map(job => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{job.title}</h3>
                  <p className="text-gray-600">{job.company_name}</p>
                </div>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {job.job_type.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <div className="flex items-center text-gray-600 mb-4">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{job.city ? `${job.city}, ` : ''}{job.country}</span>
              </div>

              {job.salary_range_min && job.salary_range_max && (
                <div className="text-gray-700 mb-4">
                  <strong>Salary:</strong> {job.currency} {job.salary_range_min.toLocaleString()} - {job.salary_range_max.toLocaleString()}
                </div>
              )}

              {job.requirements && (
                <div className="text-gray-700 mb-4">
                  <strong>Requirements:</strong>
                  <p className="mt-1 text-sm">{job.requirements}</p>
                </div>
              )}

              {job.application_deadline && (
                <div className="text-gray-600 text-sm mb-4">
                  <strong>Application Deadline:</strong> {new Date(job.application_deadline).toLocaleDateString()}
                </div>
              )}

              <button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                disabled={applyingId === job.id}
                onClick={() => handleApply(job.id)}
              >
                {applyingId === job.id ? 'Applying...' : 'Apply Now'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default JobsTab;