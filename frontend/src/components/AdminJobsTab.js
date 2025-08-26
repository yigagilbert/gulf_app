import React, { useState, useEffect } from 'react';
import APIService from '../services/APIService';

const initialJobForm = {
  title: '',
  company_name: '',
  country: '',
  city: '',
  job_type: 'full_time',
  salary_range_min: '',
  salary_range_max: '',
  currency: 'USD',
  requirements: '',
  benefits: '',
  application_deadline: ''
};

const jobTypes = [
  'full_time', 'part_time', 'contract', 'temporary'
];

const AdminJobsTab = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(initialJobForm);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(initialJobForm);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const jobsData = await APIService.getJobs({ is_active: true });
      setJobs(jobsData);
    } catch (err) {
      setError('Failed to fetch jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm({ ...editForm, [name]: value });
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError(null);
    setSuccess(null);
    try {
      // Clean up salary fields
      const jobData = {
        ...form,
        salary_range_min: form.salary_range_min ? parseFloat(form.salary_range_min) : null,
        salary_range_max: form.salary_range_max ? parseFloat(form.salary_range_max) : null,
        application_deadline: form.application_deadline || null
      };
      await APIService.createJob(jobData);
      setSuccess('Job created successfully!');
      setForm(initialJobForm);
      fetchJobs();
    } catch (err) {
      setError(err.message || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  // Edit job
  const startEditJob = (job) => {
    setEditingId(job.id);
    setEditForm({
      title: job.title,
      company_name: job.company_name,
      country: job.country,
      city: job.city || '',
      job_type: job.job_type,
      salary_range_min: job.salary_range_min || '',
      salary_range_max: job.salary_range_max || '',
      currency: job.currency,
      requirements: job.requirements || '',
      benefits: job.benefits || '',
      application_deadline: job.application_deadline ? job.application_deadline.split('T')[0] : ''
    });
  };

  const cancelEditJob = () => {
    setEditingId(null);
    setEditForm(initialJobForm);
  };

  const handleEditJob = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      // Clean up salary fields
      const jobData = {
        ...editForm,
        salary_range_min: editForm.salary_range_min ? parseFloat(editForm.salary_range_min) : null,
        salary_range_max: editForm.salary_range_max ? parseFloat(editForm.salary_range_max) : null,
        application_deadline: editForm.application_deadline || null
      };
      await APIService.updateJob(editingId, jobData);
      setSuccess('Job updated successfully!');
      setEditingId(null);
      fetchJobs();
    } catch (err) {
      setError(err.message || 'Failed to update job');
    }
  };

  // Delete job
  const startDeleteJob = (jobId) => {
    setDeletingId(jobId);
  };

  const cancelDeleteJob = () => {
    setDeletingId(null);
  };

  const handleDeleteJob = async () => {
    setError(null);
    try {
      await APIService.deleteJob(deletingId);
      setSuccess('Job deleted successfully!');
      setDeletingId(null);
      fetchJobs();
    } catch (err) {
      setError(err.message || 'Failed to delete job');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Job Management</h2>

      {/* Job Creation Form */}
      <form onSubmit={handleCreateJob} className="mb-8 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Create New Job</h3>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{success}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input name="title" value={form.title} onChange={handleChange} required placeholder="Job Title" className="px-3 py-2 border rounded-lg" />
          <input name="company_name" value={form.company_name} onChange={handleChange} required placeholder="Company Name" className="px-3 py-2 border rounded-lg" />
          <input name="country" value={form.country} onChange={handleChange} required placeholder="Country" className="px-3 py-2 border rounded-lg" />
          <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="px-3 py-2 border rounded-lg" />
          <select name="job_type" value={form.job_type} onChange={handleChange} className="px-3 py-2 border rounded-lg">
            {jobTypes.map(type => <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>)}
          </select>
          <input name="currency" value={form.currency} onChange={handleChange} placeholder="Currency" className="px-3 py-2 border rounded-lg" />
          <input name="salary_range_min" value={form.salary_range_min} onChange={handleChange} type="number" min="0" step="0.01" placeholder="Salary Min" className="px-3 py-2 border rounded-lg" />
          <input name="salary_range_max" value={form.salary_range_max} onChange={handleChange} type="number" min="0" step="0.01" placeholder="Salary Max" className="px-3 py-2 border rounded-lg" />
          <input name="application_deadline" value={form.application_deadline} onChange={handleChange} type="date" placeholder="Application Deadline" className="px-3 py-2 border rounded-lg" />
        </div>
        <textarea name="requirements" value={form.requirements} onChange={handleChange} placeholder="Requirements" className="w-full px-3 py-2 border rounded-lg" />
        <textarea name="benefits" value={form.benefits} onChange={handleChange} placeholder="Benefits" className="w-full px-3 py-2 border rounded-lg" />
        <button type="submit" disabled={creating} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">{creating ? 'Creating...' : 'Create Job'}</button>
      </form>

      {/* Job List */}
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Jobs</h3>
      {loading ? (
        <p>Loading jobs...</p>
      ) : jobs.length === 0 ? (
        <p className="text-gray-500">No jobs found.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map(job => (
            <div key={job.id} className="border border-gray-200 rounded-lg p-4">
              {editingId === job.id ? (
                <form onSubmit={handleEditJob} className="space-y-2 mb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input name="title" value={editForm.title} onChange={handleEditChange} required placeholder="Job Title" className="px-2 py-1 border rounded-lg" />
                    <input name="company_name" value={editForm.company_name} onChange={handleEditChange} required placeholder="Company Name" className="px-2 py-1 border rounded-lg" />
                    <input name="country" value={editForm.country} onChange={handleEditChange} required placeholder="Country" className="px-2 py-1 border rounded-lg" />
                    <input name="city" value={editForm.city} onChange={handleEditChange} placeholder="City" className="px-2 py-1 border rounded-lg" />
                    <select name="job_type" value={editForm.job_type} onChange={handleEditChange} className="px-2 py-1 border rounded-lg">
                      {jobTypes.map(type => <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                    <input name="currency" value={editForm.currency} onChange={handleEditChange} placeholder="Currency" className="px-2 py-1 border rounded-lg" />
                    <input name="salary_range_min" value={editForm.salary_range_min} onChange={handleEditChange} type="number" min="0" step="0.01" placeholder="Salary Min" className="px-2 py-1 border rounded-lg" />
                    <input name="salary_range_max" value={editForm.salary_range_max} onChange={handleEditChange} type="number" min="0" step="0.01" placeholder="Salary Max" className="px-2 py-1 border rounded-lg" />
                    <input name="application_deadline" value={editForm.application_deadline} onChange={handleEditChange} type="date" placeholder="Application Deadline" className="px-2 py-1 border rounded-lg" />
                  </div>
                  <textarea name="requirements" value={editForm.requirements} onChange={handleEditChange} placeholder="Requirements" className="w-full px-2 py-1 border rounded-lg" />
                  <textarea name="benefits" value={editForm.benefits} onChange={handleEditChange} placeholder="Benefits" className="w-full px-2 py-1 border rounded-lg" />
                  <div className="flex gap-2 mt-2">
                    <button type="submit" className="bg-green-600 text-white px-4 py-1 rounded-lg hover:bg-green-700">Save</button>
                    <button type="button" onClick={cancelEditJob} className="bg-gray-300 px-4 py-1 rounded-lg">Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-bold text-gray-900">{job.title}</h4>
                      <p className="text-gray-600 text-sm">{job.company_name} &mdash; {job.country}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">{job.job_type.replace('_', ' ').toUpperCase()}</span>
                  </div>
                  <div className="text-gray-700 text-sm mb-1">Salary: {job.currency} {job.salary_range_min} - {job.salary_range_max}</div>
                  <div className="text-gray-700 text-sm mb-1">Deadline: {job.application_deadline ? new Date(job.application_deadline).toLocaleDateString() : 'N/A'}</div>
                  <div className="text-gray-700 text-sm mb-1">Requirements: {job.requirements || 'N/A'}</div>
                  <div className="text-gray-700 text-sm mb-1">Benefits: {job.benefits || 'N/A'}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => startEditJob(job)} className="bg-yellow-500 text-white px-3 py-1 rounded-lg hover:bg-yellow-600">Edit</button>
                    <button onClick={() => startDeleteJob(job.id)} className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700">Delete</button>
                  </div>
                </>
              )}
              {/* Delete confirmation */}
              {deletingId === job.id && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mt-2">
                  <p>Are you sure you want to delete this job?</p>
                  <div className="flex gap-2 mt-2">
                    <button onClick={handleDeleteJob} className="bg-red-600 text-white px-4 py-1 rounded-lg hover:bg-red-700">Yes, Delete</button>
                    <button onClick={cancelDeleteJob} className="bg-gray-300 px-4 py-1 rounded-lg">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminJobsTab;