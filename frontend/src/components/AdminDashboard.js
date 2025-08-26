
import React, { useState, useEffect } from 'react';
import { useAuth } from '../JobPlacementApp';
import { LogOut, User, Briefcase, Calendar } from 'lucide-react';
import JobsTab from './JobsTab';
import AdminClientsTab from './AdminClientsTab';
import AdminJobsTab from './AdminJobsTab';
import AdminAnalyticsTab from './AdminAnalyticsTab';
import APIService from '../services/APIService';
import AdminApplicationsTab from './AdminApplicationsTab';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, logout } = useAuth();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setError(null);
      // FIXED: Use the proper APIService method
      const clientsData = await APIService.getClients();
      setClients(clientsData);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClient = async (clientId, notes = '') => {
    try {
      // FIXED: Use the proper APIService method
      await APIService.verifyClient(clientId, notes);
      await loadClients(); // Reload clients after verification
    } catch (error) {
      console.error('Error verifying client:', error);
      setError(error.message);
    }
  };

  const handleDownloadDocument = async (documentId, fileName) => {
    try {
      // FIXED: Use the proper APIService method with automatic download
      await APIService.downloadDocument(documentId, fileName);
    } catch (error) {
      console.error('Download failed:', error);
      setError(error.message);
    }
  };

  // Add error handling to the UI
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Add error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 mx-4">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-900 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center h-auto sm:h-16 py-4 sm:py-0">
            <div className="flex items-center mb-4 sm:mb-0">
              <img src={process.env.PUBLIC_URL + '/gulf.png'} alt="Logo" className="h-10 w-15 mr-3" />
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gulf Consultants Admin</h1>
            </div>
            <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <span className="text-gray-700 text-sm sm:text-base">Admin: {user?.email}</span>
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
                { key: 'clients', label: 'Client Management', icon: User },
                { key: 'jobs', label: 'Job Management', icon: Briefcase },
                { key: 'applications', label: 'Applications', icon: Calendar },
                { key: 'analytics', label: 'Analytics', icon: Calendar },
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
            {activeTab === 'clients' && (
              <AdminClientsTab 
                clients={clients} 
                onVerifyClient={handleVerifyClient}
                onDownloadDocument={handleDownloadDocument}
              />
            )}
            {activeTab === 'jobs' && <AdminJobsTab />}
            {activeTab === 'applications' && <AdminApplicationsTab />}
            {activeTab === 'analytics' && <AdminAnalyticsTab />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;