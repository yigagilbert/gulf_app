import React, { useState, useEffect } from 'react';
import { LogOut, User, FileText, Briefcase, Calendar } from 'lucide-react';
import { useAuth } from '../JobPlacementApp';
import APIService from '../services/APIService';
import ProfileTab from './ProfileTab';
import DocumentsTab from './DocumentsTab';
import JobsTab from './JobsTab';
import ApplicationsTab from './ApplicationsTab';

const ClientDashboard = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setError(null);
      // FIXED: Use proper APIService methods with error handling
      const [profileData, documentsData, jobsData] = await Promise.allSettled([
        APIService.getProfile(),
        APIService.getDocuments(),
        APIService.getJobs()
      ]);

      // Handle each result separately
      if (profileData.status === 'fulfilled') {
        setProfile(profileData.value);
      } else {
        console.error('Profile loading failed:', profileData.reason);
      }

      if (documentsData.status === 'fulfilled') {
        setDocuments(documentsData.value);
      } else {
        console.error('Documents loading failed:', documentsData.reason);
        setDocuments([]); // Set empty array as fallback
      }

      if (jobsData.status === 'fulfilled') {
        setJobs(jobsData.value);
      } else {
        console.error('Jobs loading failed:', jobsData.reason);
        setJobs([]); // Set empty array as fallback
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div className="flex items-center mb-4 sm:mb-0">
              <img src={process.env.PUBLIC_URL + '/gulf.png'} alt="Logo" className="h-10 w-15 mr-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gulf Consultants</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-gray-700 text-sm sm:text-base">Welcome, {user?.email}</span>
              <button
                onClick={logout}
                className="flex items-center px-3 py-2 text-gray-700 hover:text-gray-900 rounded-lg border border-gray-200 sm:border-none"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64 mb-4 lg:mb-0">
            <nav className="space-y-2 flex flex-row lg:flex-col gap-2 lg:gap-0 overflow-x-auto lg:overflow-visible">
              {[ 
                { key: 'profile', label: 'My Profile', icon: User },
                { key: 'documents', label: 'Documents', icon: FileText },
                { key: 'jobs', label: 'Job Opportunities', icon: Briefcase },
                { key: 'applications', label: 'My Applications', icon: Calendar },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`w-full flex items-center px-4 py-2 text-left rounded-lg transition-colors ${
                    activeTab === key
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'profile' && (
              <ProfileTab profile={profile} onUpdate={loadData} />
            )}
            {activeTab === 'documents' && (
              <DocumentsTab documents={documents} onUpdate={loadData} />
            )}
            {activeTab === 'jobs' && (
              <JobsTab jobs={jobs} />
            )}
            {activeTab === 'applications' && (
              <ApplicationsTab />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;