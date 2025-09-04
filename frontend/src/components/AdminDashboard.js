import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, User, Briefcase, Calendar, BarChart3, Search, Filter,
  Plus, Download, Eye, Edit, CheckCircle, XCircle, Clock,
  Users, FileText, TrendingUp, AlertTriangle, ChevronDown,
  MoreHorizontal, RefreshCw, Settings, Bell
} from 'lucide-react';
import { useAuth } from '../AuthProvider';
import APIService, { APIError } from '../services/APIService';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';
import ConfirmDialog from './ConfirmDialog';

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
      name: 'Applications Today',
      value: stats?.applicationsToday || 0,
      change: '-2%',
      changeType: 'decrease',
      icon: Calendar,
      color: 'bg-purple-500'
    },
    {
      name: 'Placement Rate',
      value: `${stats?.placementRate || 0}%`,
      change: '+8%',
      changeType: 'increase',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.name}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
              <div className="flex items-center mt-2">
                <span className={`text-sm font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-1">vs last month</span>
              </div>
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

// Enhanced Client Management Table
const ClientsTable = ({ clients, onViewClient, onVerifyClient, loading, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');

  const filteredClients = useMemo(() => {
    return clients?.filter(client => {
      const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            client.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !statusFilter || client.status === statusFilter;
      return matchesSearch && matchesStatus;
    })?.sort((a, b) => {
      if (a[sortField] < b[sortField]) return sortDirection === 'asc' ? -1 : 1;
      if (a[sortField] > b[sortField]) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }) || [];
  }, [clients, searchTerm, statusFilter, sortField, sortDirection]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
      {/* Table header with filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1 flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="under_review">Under Review</option>
                <option value="verified">Verified</option>
                <option value="placed">Placed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
            <button className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Client
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Documents</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredClients.map((client) => (
              <tr key={client.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                    client.status === 'verified' ? 'bg-green-100 text-green-800' :
                    client.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 text-gray-400 mr-2" />
                    <span className="text-sm text-gray-900">{client.documentsCount} / 7</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(client.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => onViewClient(client.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onVerifyClient(client)}
                      disabled={client.status === 'verified'}
                      className={`p-2 ${
                        client.status === 'verified' 
                          ? 'text-gray-400 cursor-not-allowed' 
                          : 'text-green-600 hover:bg-green-50'
                      } rounded-lg`}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <p className="text-sm text-gray-700">
          Showing {filteredClients.length} of {clients?.length || 0} clients
        </p>
        <div className="flex space-x-2">
          <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Previous</button>
          <button className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Next</button>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('clients');
  const [stats, setStats] = useState(null);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);

  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // PATCH: Improved data fetching and mapping
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch stats and clients in parallel
      const [statsData, clientsData] = await Promise.all([
        APIService.request('/admin/dashboard_stats'),
        APIService.getClients()
      ]);

      setStats(statsData);

      // PATCH: Map and normalize client data for UI
      const mappedClients = clientsData.map(client => ({
        id: client.id,
        name: [client.first_name, client.last_name].filter(Boolean).join(' ') || client.user_email || 'Unknown',
        email: client.user_email || '',
        status: client.status || 'new',
        documentsCount: Array.isArray(client.documents) ? client.documents.length : (client.documentsCount || 0),
        created_at: client.created_at,
        ...client // Include other fields as needed
      }));

      setClients(mappedClients);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleVerifyClient = (client) => {
    setSelectedClient(client);
    setShowConfirm(true);
  };

  const confirmVerify = async () => {
    if (!selectedClient) return;

    try {
      await APIService.verifyClient(selectedClient.id);
      loadDashboardData();
    } catch (err) {
      setError('Failed to verify client');
    } finally {
      setShowConfirm(false);
      setSelectedClient(null);
    }
  };

  const handleViewClient = (clientId) => {
    navigate(`/admin/clients/${clientId}`);
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50">
      {error && <Toast type="error" message={error} />}

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmVerify}
        title="Verify Client"
        message={`Are you sure you want to verify ${selectedClient?.name}'s profile?`}
        type="info"
      />

      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Users className="h-8 w-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Bell className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            <div className="relative">
              <button className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg">
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-500" />
                </div>
                <span className="text-sm font-medium text-gray-900">{user?.name || 'Admin'}</span>
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
              { id: 'clients', name: 'Clients', icon: Users },
              { id: 'jobs', name: 'Jobs', icon: Briefcase },
              { id: 'applications', name: 'Applications', icon: Calendar },
              { id: 'analytics', name: 'Analytics', icon: BarChart3 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
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
        {activeTab === 'clients' && (
          <div>
            <AdminStats stats={stats} />
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Client Management</h2>
              <p className="text-gray-600">Manage client profiles, verification, and documentation.</p>
            </div>

            <ClientsTable 
              clients={clients}
              onViewClient={handleViewClient}
              onVerifyClient={handleVerifyClient}
              loading={loading}
              onRefresh={loadDashboardData}
            />
          </div>
        )}

        {activeTab === 'jobs' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Management</h2>
              <p className="text-gray-600">Create, edit, and manage job opportunities.</p>
            </div>
            {/* Jobs management component would go here */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
              <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Job management interface coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'applications' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Applications</h2>
              <p className="text-gray-600">Review and manage job applications.</p>
            </div>
            {/* Applications management component would go here */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Applications management interface coming soon...</p>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analytics</h2>
              <p className="text-gray-600">View detailed reports and analytics.</p>
            </div>
            {/* Analytics component would go here */}
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-100 text-center">
              <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Analytics dashboard coming soon...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;