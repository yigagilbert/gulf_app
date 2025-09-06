import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, User, Briefcase, Calendar, BarChart3, Search, Filter,
  Plus, Download, Eye, Edit, CheckCircle, XCircle, Clock,
  Users, FileText, TrendingUp, AlertTriangle, ChevronDown,
  MoreHorizontal, RefreshCw, Settings, Bell, Menu, X, MessageCircle
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import APIService, { APIError } from '../services/APIService';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';
import AdminClientsTab from './AdminClientsTab';
import AdminJobsTab from './AdminJobsTab';
import AdminApplicationsTab from './AdminApplicationsTab';
import AdminAnalyticsTab from './AdminAnalyticsTab';
import AdminChatTab from './AdminChatTab';

// Admin Stats Dashboard
const AdminStats = ({ stats }) => {
  const statCards = [
    {
      name: 'Total Clients',
      value: stats?.totalClients || 0,
      change: '+12%',
      changeType: 'increase',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      name: 'Active Jobs',
      value: stats?.activeJobs || 0,
      change: '+5%',
      changeType: 'increase',
      icon: Briefcase,
      color: 'bg-green-500'
    },
    {
      name: 'Applications',
      value: stats?.totalApplications || 0,
      change: '+18%',
      changeType: 'increase',
      icon: FileText,
      color: 'bg-purple-500'
    },
    {
      name: 'Placements',
      value: stats?.totalPlacements || 0,
      change: '+3%',
      changeType: 'increase',
      icon: CheckCircle,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
                <div className="flex items-baseline space-x-2">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <span className={`text-sm font-medium ${
                    stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                </div>
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
const RecentActivity = ({ activities = [] }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
          View all
        </button>
      </div>
      
      {activities.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">No recent activity</p>
          <p className="text-sm text-gray-400">Activity will appear here as users interact with the system</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.slice(0, 5).map((activity, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">{activity.description}</p>
                <p className="text-xs text-gray-500 mt-1">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activities, setActivities] = useState([]);

  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Load dashboard statistics
      const [clientsData, jobsData, applicationsData] = await Promise.all([
        APIService.getClients().catch(() => []),
        APIService.getJobs().catch(() => []),
        APIService.getAllApplications().catch(() => [])
      ]);

      const dashboardStats = {
        totalClients: clientsData?.length || 0,
        activeJobs: jobsData?.filter(job => job.is_active)?.length || 0,
        totalApplications: applicationsData?.length || 0,
        totalPlacements: applicationsData?.filter(app => app.status === 'accepted')?.length || 0
      };

      setStats(dashboardStats);

      // Mock recent activities - replace with real data
      setActivities([
        { description: 'New client registered', timestamp: '2 hours ago' },
        { description: 'Job application submitted', timestamp: '4 hours ago' },
        { description: 'Client profile verified', timestamp: '6 hours ago' },
        { description: 'New job posted', timestamp: '1 day ago' },
        { description: 'Application status updated', timestamp: '2 days ago' }
      ]);

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
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'applications', label: 'Applications', icon: FileText },
    { id: 'chat', label: 'Messages', icon: MessageCircle },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp }
  ];

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {error && <Toast type="error" message={error} />}
      
      {/* Mobile Header */}
      <header className="bg-white shadow-sm lg:hidden">
        <div className="px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 flex items-center justify-center">
              <img
                src="https://customer-assets.emergentagent.com/job_mobile-recruit/artifacts/58ezwzoy_gulf.png"
                alt="Gulf Consultants"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Gulf Consultants</h1>
              <p className="text-sm text-gray-600">Admin Panel</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 hover:bg-gray-100 rounded-lg relative"
            >
              <Bell className="h-5 w-5 text-gray-600" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
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
                <div className="h-10 w-10 flex items-center justify-center">
                  <img
                    src="https://customer-assets.emergentagent.com/job_mobile-recruit/artifacts/58ezwzoy_gulf.png"
                    alt="Gulf Consultants"
                    className="h-full w-full object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Gulf Consultants</h2>
                  <p className="text-sm text-gray-600">Job Placement System</p>
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
                    {item.id === 'chat' && (
                      <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                        3
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
            
            <div className="px-4 py-4 border-t border-gray-200">
              <div className="flex items-center space-x-3 px-4 py-3 mb-2">
                <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                  <p className="text-xs text-gray-500">Administrator</p>
                </div>
              </div>
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
                      {item.id === 'chat' && (
                        <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-2 py-1">
                          3
                        </span>
                      )}
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
                    Gulf Consultants Dashboard
                  </h1>
                  <p className="text-gray-600">
                    Monitor and manage international job placements and client services.
                  </p>
                </div>
                
                <AdminStats stats={stats} />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <RecentActivity activities={activities} />
                  
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setActiveTab('clients')}
                        className="w-full flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <Users className="h-5 w-5 mr-3" />
                          <span>Manage Clients</span>
                        </div>
                        <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('jobs')}
                        className="w-full flex items-center justify-between p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <Briefcase className="h-5 w-5 mr-3" />
                          <span>Post New Job</span>
                        </div>
                        <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('chat')}
                        className="w-full flex items-center justify-between p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                      >
                        <div className="flex items-center">
                          <MessageCircle className="h-5 w-5 mr-3" />
                          <span>Client Messages</span>
                        </div>
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1">3</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'clients' && <AdminClientsTab />}
            {activeTab === 'jobs' && <AdminJobsTab />}
            {activeTab === 'applications' && <AdminApplicationsTab />}
            {activeTab === 'chat' && <AdminChatTab />}
            {activeTab === 'analytics' && <AdminAnalyticsTab />}
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
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-800">New client registration</p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-800">Job application submitted</p>
                <p className="text-xs text-gray-500 mt-1">4 hours ago</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-gray-800">Document pending review</p>
                <p className="text-xs text-gray-500 mt-1">6 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;