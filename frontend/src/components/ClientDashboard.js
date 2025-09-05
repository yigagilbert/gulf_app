import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LogOut, User, FileText, Briefcase, Calendar, 
  Bell, Settings, ChevronDown, Search, Filter,
  AlertCircle, CheckCircle, Clock, TrendingUp, BarChart3, Menu, X
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
    {
      name: 'Documents Uploaded',
      value: documents?.length || 0,
      suffix: '',
      icon: FileText,
      color: 'bg-green-500',
      description: 'Upload required documents to complete your profile'
    },
    {
      name: 'Job Applications',
      value: applications?.length || 0,
      suffix: '',
      icon: Briefcase,
      color: 'bg-blue-500',
      description: 'Total number of job applications submitted'
    },
    {
      name: 'Profile Status',
      value: profile?.status === 'verified' ? 'Verified' : 'Pending',
      suffix: '',
      icon: CheckCircle,
      color: profile?.status === 'verified' ? 'bg-green-500' : 'bg-yellow-500',
      description: 'Current verification status of your profile'
    },
    {
      name: 'Active Applications',
      value: applications?.filter(app => ['applied', 'screening', 'interview'].includes(app.status))?.length || 0,
      suffix: '',
      icon: Clock,
      color: 'bg-purple-500',
      description: 'Applications currently under review'
    }
  ], [profile, documents, applications]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <div className="flex items-center space-x-2">
                  <p className="text-2xl font-bold text-gray-900">
                    {stat.value}{stat.suffix}
                  </p>
                </div>
                <p className="text-xs text-gray-500 mt-2">{stat.description}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Recent activity component
const RecentActivity = ({ applications }) => {
  const recentApplications = applications?.slice(0, 5) || [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Applications</h3>
      {recentApplications.length === 0 ? (
        <div className="text-center py-8">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No applications yet</p>
          <p className="text-sm text-gray-400">Start applying to jobs to see your activity here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {recentApplications.map((app, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{app.job_title}</h4>
                <p className="text-sm text-gray-600">Applied on {new Date(app.applied_date).toLocaleDateString()}</p>
              </div>
              <div className="ml-4">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                  app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  app.status === 'interview' ? 'bg-blue-100 text-blue-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {app.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { logout, user } = useAuth();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [profileData, documentsData, jobsData, applicationsData] = await Promise.all([
        APIService.getProfile().catch(() => null),
        APIService.getDocuments().catch(() => []),
        APIService.getJobs().catch(() => []),
        APIService.getMyApplications().catch(() => [])
      ]);

      setProfile(profileData);
      setDocuments(documentsData || []);
      setJobs(jobsData || []);

      const mappedApplications = (applicationsData || []).map(app => ({
        ...app,
        job_title: app.job_title || (jobsData?.find(j => j.id === app.job_id)?.title || 'Unknown'),
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

  const tabItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'applications', label: 'Applications', icon: Calendar }
  ];

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {error && <Toast type="error" message={error} />}
      <ClientChatWidget />
      
      {/* Mobile Header */}
      <header className="bg-white shadow-sm lg:hidden">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {profile?.profile_photo_url ? (
              <img
                src={profile.profile_photo_url}
                alt="Profile"
                className="h-8 w-8 rounded-full border-2 border-blue-600 object-cover"
              />
            ) : (
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <User className="h-5 w-5 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back!</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-lg relative"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              {notifications.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="flex h-screen lg:h-auto">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <div className="flex flex-col w-64 bg-white shadow-sm border-r border-gray-200">
            <div className="flex items-center px-6 py-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {profile?.profile_photo_url ? (
                  <img
                    src={profile.profile_photo_url}
                    alt="Profile"
                    className="h-10 w-10 rounded-full border-2 border-blue-600 object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-white" />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user?.email : 'Client'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {profile?.status === 'verified' ? 'Verified Client' : 'Pending Verification'}
                  </p>
                </div>
              </div>
            </div>
            
            <nav className="flex-1 px-4 py-6 space-y-2">
              {tabItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === item.id
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
            
            <div className="px-4 py-4 border-t border-gray-200">
              <button
                onClick={logout}
                className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)}></div>
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl">
              <div className="flex items-center justify-between px-6 py-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <nav className="px-4 py-6 space-y-2">
                {tabItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                        activeTab === item.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
              
              <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-gray-200">
                <button
                  onClick={logout}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <LogOut className="mr-3 h-5 w-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
            {activeTab === 'dashboard' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    Welcome back{profile ? `, ${profile.first_name || 'there'}` : ''}!
                  </h1>
                  <p className="text-gray-600">
                    Here's an overview of your job placement journey.
                  </p>
                </div>
                
                <DashboardStats 
                  profile={profile} 
                  documents={documents} 
                  applications={applications} 
                />
                <RecentActivity applications={applications} />
              </div>
            )}
            
            {activeTab === 'profile' && (
              <ProfileTab 
                profile={profile} 
                onProfileUpdate={setProfile}
                onDataReload={loadDashboardData}
              />
            )}
            
            {activeTab === 'documents' && (
              <DocumentsTab 
                documents={documents}
                onDocumentsUpdate={setDocuments}
                onDataReload={loadDashboardData}
              />
            )}
            
            {activeTab === 'jobs' && (
              <JobsTab 
                jobs={jobs}
                onJobsUpdate={setJobs}
                onDataReload={loadDashboardData}
              />
            )}
            
            {activeTab === 'applications' && (
              <ApplicationsTab 
                applications={applications}
                onApplicationsUpdate={setApplications}
                onDataReload={loadDashboardData}
              />
            )}
          </div>
        </main>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="fixed inset-0 z-40 lg:relative lg:inset-auto">
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setShowNotifications(false)}
          ></div>
          <div className="fixed top-20 right-4 left-4 lg:absolute lg:right-0 lg:left-auto lg:top-full lg:mt-2 w-auto lg:w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Notifications</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No new notifications</p>
            ) : (
              notifications.map((notification, index) => (
                <div key={index} className="mb-4 last:mb-0 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-gray-800">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">{notification.timestamp}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;