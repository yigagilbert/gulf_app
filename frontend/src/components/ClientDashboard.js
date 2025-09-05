import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, User, FileText, Briefcase, Calendar, 
  Bell, Settings, ChevronDown, Search, Filter,
  AlertCircle, CheckCircle, Clock, TrendingUp, BarChart3
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import APIService, { APIError } from '../services/APIService';
import ProfileTab from './ProfileTab';
import ClientChatWidget from './ClientChatWidget';
import DocumentsTab from './DocumentsTab';
import JobsTab from './JobsTab';
import ApplicationsTab from './ApplicationsTab';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

// Dashboard stats component
const DashboardStats = ({ profile, documents, applications }) => {
  const stats = useMemo(() => [
    // {
    //   name: 'Profile Completion',
    //   value: profile ? calculateProfileCompletion(profile) : 0,
    //   suffix: '%',
    //   icon: User,
    //   color: 'bg-blue-500',
    //   description: 'Complete your profile to increase job matching'
    // },
    {
      name: 'Documents Uploaded',
      value: documents?.length || 0,
      suffix: '',
      icon: FileText,
      color: 'bg-green-500',
      description: 'Upload all required documents'
    },
    {
      name: 'Active Applications',
      value: applications?.filter(app => ['pending', 'under_review', 'interview'].includes(app.status))?.length || 0,
      suffix: '',
      icon: Calendar,
      color: 'bg-purple-500',
      description: 'Applications in progress'
    },
    {
      name: 'Success Rate',
      value: applications?.length ? Math.round((applications.filter(app => app.status === 'accepted').length / applications.length) * 100) : 0,
      suffix: '%',
      icon: TrendingUp,
      color: 'bg-orange-500',
      description: 'Your application success rate'
    }
  ], [profile, documents, applications]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900">
                {stat.value}{stat.suffix}
              </p>
              <p className="text-xs text-gray-500 mt-1">{stat.description}</p>
            </div>
            <div className={`${stat.color} rounded-lg p-3`}>
              <stat.icon className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Quick actions component
const QuickActions = ({ onAction }) => {
  const actions = [
    {
      name: 'Update Profile',
      icon: User,
      color: 'bg-blue-100 text-blue-600',
      onClick: () => onAction('profile')
    },
    {
      name: 'Upload Documents',
      icon: FileText,
      color: 'bg-green-100 text-green-600',
      onClick: () => onAction('documents')
    },
    {
      name: 'Browse Jobs',
      icon: Briefcase,
      color: 'bg-purple-100 text-purple-600',
      onClick: () => onAction('jobs')
    },
    {
      name: 'View Applications',
      icon: Calendar,
      color: 'bg-orange-100 text-orange-600',
      onClick: () => onAction('applications')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {actions.map((action, index) => (
        <button
          key={index}
          onClick={action.onClick}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 hover:shadow-md transition-shadow text-left"
        >
          <div className={`inline-flex p-3 rounded-lg ${action.color} mb-4`}>
            <action.icon className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold text-gray-900">{action.name}</p>
          <p className="text-sm text-gray-500 mt-1">Get started now</p>
        </button>
      ))}
    </div>
  );
};

// Status Badge component (inferred from usage)
const StatusBadge = ({ status, size = 'md' }) => {
  const configs = {
    pending: 'bg-yellow-100 text-yellow-800',
    under_review: 'bg-blue-100 text-blue-800',
    interview: 'bg-purple-100 text-purple-800',
    accepted: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex rounded-full font-medium ${sizeClasses} ${configs[status] || 'bg-gray-100 text-gray-800'}`}>
      {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
    </span>
  );
};

const getUserDisplayName = (profile, user) => {
  if (profile?.first_name || profile?.last_name) {
    return [profile.first_name, profile.last_name].filter(Boolean).join(' ');
  }
  return user?.email || 'User';
};

const ClientDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const { logout, user } = useAuth();

  // PATCH: Improved data loading and mapping
const loadDashboardData = useCallback(async () => {
  setLoading(true);
  setError(null);

  try {
    // Add logs before each API call
    console.log('Fetching profile...');
    const profileData = await APIService.getProfile();
    console.log('Profile data:', profileData);

    console.log('Fetching documents...');
    const documentsData = await APIService.getDocuments();
    console.log('Documents data:', documentsData);

    console.log('Fetching jobs...');
    const jobsData = await APIService.getJobs();
    console.log('Jobs data:', jobsData);

    console.log('Fetching applications...');
    const applicationsData = await APIService.getMyApplications();
    console.log('Applications data:', applicationsData);

    setProfile(profileData);
    setDocuments(documentsData);
    setJobs(jobsData);

    const mappedApplications = applicationsData.map(app => ({
      ...app,
      job_title: app.job_title || (jobsData.find(j => j.id === app.job_id)?.title || 'Unknown'),
      status: app.application_status || app.status || 'pending'
    }));
    setApplications(mappedApplications);

    setNotifications([]); // Placeholder for notifications
  } catch (err) {
    console.error('Dashboard data load error:', err);
    setError(err instanceof APIError ? err.message : 'Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {error && <Toast type="error" message={error} />}
      <ClientChatWidget user={user} />
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* PATCH: Show profile photo if available */}
            {profile?.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt="Profile"
                className="h-8 w-8 rounded-full border-2 border-green-600 object-cover"
              />
            ) : (
              <Briefcase className="h-8 w-8 text-green-600" />
            )}
            <h1 className="text-xl font-bold text-gray-900">Client Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 hover:bg-gray-100 rounded-lg relative"
              >
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full" />
                )}
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No new notifications</p>
                  ) : (
                    notifications.map((notification, index) => (
                      <div key={index} className="mb-4 last:mb-0 p-3 bg-yellow-50 rounded-lg">
                        <p className="text-sm text-yellow-800">{notification.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            <div className="relative">
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  {profile?.profile_photo_url ? (
                    <img
                      src={profile.profile_photo_url}
                      alt="Profile"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                <span className="text-sm font-medium text-gray-900">
                  {getUserDisplayName(profile, user)}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {/* Dropdown menu would go here */}
            </div>
            <button
              onClick={logout}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
              { id: 'profile', name: 'Profile', icon: User },
              { id: 'documents', name: 'Documents', icon: FileText },
              { id: 'jobs', name: 'Jobs', icon: Briefcase },
              { id: 'applications', name: 'Applications', icon: Calendar }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <div className="flex-1">
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome back, {getUserDisplayName(profile, user)}!
                </h2>
                <p className="text-gray-600">
                  Here's what's happening with your job placement journey.
                </p>
              </div>

              <DashboardStats 
                profile={profile} 
                documents={documents} 
                applications={applications} 
              />

              <QuickActions onAction={setActiveTab} />

              {/* Recent activity */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
                {applications?.length > 0 ? (
                  <div className="space-y-4">
                    {applications.slice(0, 3).map((application, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{application.job_title}</p>
                          <p className="text-sm text-gray-500">Applied on {new Date(application.created_at).toLocaleDateString()}</p>
                        </div>
                        <StatusBadge status={application.status} size="sm" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No recent applications. Browse jobs to get started!</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileTab profile={profile} onUpdate={loadDashboardData} />
          )}

          {activeTab === 'documents' && (
            <DocumentsTab documents={documents} onUpdate={loadDashboardData} />
          )}

          {activeTab === 'jobs' && (
            <JobsTab jobs={jobs} onUpdate={loadDashboardData} />
          )}

          {activeTab === 'applications' && (
            <ApplicationsTab applications={applications} onUpdate={loadDashboardData} />
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;