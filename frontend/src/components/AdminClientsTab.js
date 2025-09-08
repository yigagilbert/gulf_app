import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, UserPlus, Search, Filter, Eye, Edit, Check, X, 
  ChevronDown, Mail, Phone, Calendar, AlertCircle, 
  RefreshCw, MoreHorizontal, Settings, Upload, FileText
} from 'lucide-react';
import APIService from '../services/APIService';
import AdminClientCreation from './AdminClientCreation';
import AdminDocumentUpload from './AdminDocumentUpload';
import AdminClientDocuments from './AdminClientDocuments';
import PDFViewer from './PDFViewer';
import LoadingSpinner from './LoadingSpinner';
import Toast from './Toast';

const AdminClientsTab = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showDocumentUpload, setShowDocumentUpload] = useState(false);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [showPDFViewer, setShowPDFViewer] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [clientDocuments, setClientDocuments] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const clientsData = await APIService.request('/admin/clients');
      setClients(clientsData || []);
    } catch (err) {
      setError('Failed to load clients');
      console.error('Load clients error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleClientCreated = (newClient) => {
    setSuccess(`Client account created successfully for ${newClient.email}`);
    loadClients(); // Refresh the list
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleVerifyClient = async (clientId, status, notes = '') => {
    try {
      await APIService.request(`/admin/clients/${clientId}/verify`, {
        method: 'PUT',
        body: JSON.stringify({
          status: status,
          verification_notes: notes
        })
      });
      
      setSuccess(`Client ${status === 'verified' ? 'verified' : 'status updated'} successfully`);
      loadClients();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update client status');
      console.error('Verify client error:', err);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesStatus = !statusFilter || client.status === statusFilter;
    const matchesSearch = !searchTerm || (
      client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesStatus && matchesSearch;
  });

  const statusOptions = ['new', 'under_review', 'verified', 'rejected'];
  const statusColors = {
    new: 'bg-blue-100 text-blue-800',
    under_review: 'bg-yellow-100 text-yellow-800',
    verified: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800'
  };

  const handleDocumentUploaded = async (document) => {
    setSuccess(`Document uploaded successfully`);
    // Refresh client documents
    await loadClientDocuments(selectedClient.id);
    setTimeout(() => setSuccess(null), 3000);
  };

  const loadClientDocuments = async (clientId) => {
    try {
      const documents = await APIService.request(`/admin/clients/${clientId}/documents`);
      setClientDocuments(prev => ({ ...prev, [clientId]: documents }));
    } catch (err) {
      console.error('Failed to load client documents:', err);
    }
  };

  const handleViewDocument = (document) => {
    const fileUrl = `${process.env.REACT_APP_BACKEND_URL}${document.file_path}`;
    setSelectedDocument({
      ...document,
      url: fileUrl
    });
    setShowPDFViewer(true);
  };

  const getDisplayName = (client) => {
    if (client.first_name || client.last_name) {
      return `${client.first_name || ''} ${client.last_name || ''}`.trim();
    }
    return client.user_email || 'Unknown';
  };

  if (loading) return <LoadingSpinner fullScreen />;

  return (
    <div className="space-y-6">
      {error && <Toast type="error" message={error} />}
      {success && <Toast type="success" message={success} />}
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
          <p className="text-gray-600 mt-1">
            Manage client accounts, onboarding, and verification status
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
        >
          <UserPlus className="h-5 w-5 mr-2" />
          Create Client
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white pl-4 pr-8 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Statuses</option>
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4 pointer-events-none" />
          </div>
          
          <button
            onClick={loadClients}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statusOptions.map(status => {
          const count = clients.filter(c => c.status === status).length;
          return (
            <div key={status} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{count}</p>
                </div>
                <div className={`p-2 rounded-lg ${statusColors[status]}`}>
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 mb-2">No clients found</p>
                    {searchTerm || statusFilter ? (
                      <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
                    ) : (
                      <button
                        onClick={() => setShowCreateModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Create your first client
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {client.profile_photo_url ? (
                            <img 
                              src={`${process.env.REACT_APP_BACKEND_URL}${client.profile_photo_url}`}
                              alt={getDisplayName(client)}
                              className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div className={`h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold ${client.profile_photo_url ? 'hidden' : ''}`}>
                            {getDisplayName(client).charAt(0).toUpperCase()}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {getDisplayName(client)}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Mail className="h-4 w-4 mr-1" />
                            {client.user_email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        statusColors[client.status] || 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {client.created_at ? new Date(client.created_at).toLocaleDateString() : 'Unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => navigate(`/admin/clients/${client.id}`)}
                          className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {client.status === 'under_review' && (
                          <>
                            <button
                              onClick={() => handleVerifyClient(client.id, 'verified')}
                              className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                              title="Verify Client"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleVerifyClient(client.id, 'rejected', 'Rejected by admin')}
                              className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                              title="Reject Client"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDocumentUpload(true);
                          }}
                          className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                          title="Upload Document"
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                        
                        <button
                          onClick={() => {
                            setSelectedClient(client);
                            setShowDocumentViewer(true);
                          }}
                          className="text-purple-600 hover:text-purple-700 p-1 rounded hover:bg-purple-50"
                          title="View Documents"
                        >
                          <FileText className="h-4 w-4" />
                        </button>
                        
                        <button
                          className="text-gray-600 hover:text-gray-700 p-1 rounded hover:bg-gray-50"
                          title="More Actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Client Modal */}
      <AdminClientCreation
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleClientCreated}
      />

      {/* Document Upload Modal */}
      {selectedClient && (
        <AdminDocumentUpload
          isOpen={showDocumentUpload}
          onClose={() => {
            setShowDocumentUpload(false);
            setSelectedClient(null);
          }}
          clientId={selectedClient.id}
          clientName={getDisplayName(selectedClient)}
          onSuccess={handleDocumentUploaded}
        />
      )}

      {/* Document Viewer Modal */}
      {selectedClient && (
        <AdminClientDocuments
          isOpen={showDocumentViewer}
          onClose={() => {
            setShowDocumentViewer(false);
            setSelectedClient(null);
          }}
          clientId={selectedClient.id}
          clientName={getDisplayName(selectedClient)}
        />
      )}

      {/* PDF Viewer */}
      {selectedDocument && (
        <PDFViewer
          isOpen={showPDFViewer}
          onClose={() => {
            setShowPDFViewer(false);
            setSelectedDocument(null);
          }}
          fileUrl={selectedDocument.url}
          fileName={selectedDocument.file_name}
        />
      )}

      {/* Client Documents Modal */}
      {selectedClient && clientDocuments[selectedClient.id] && (
        <div className="fixed inset-0 z-40 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
              onClick={() => setSelectedClient(null)}
            ></div>
            
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">
                  Documents for {getDisplayName(selectedClient)}
                </h3>
                <button
                  onClick={() => setSelectedClient(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {clientDocuments[selectedClient.id]?.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No documents uploaded yet</p>
                  </div>
                ) : (
                  clientDocuments[selectedClient.id]?.map((doc) => (
                    <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center space-x-3 mb-3">
                        <FileText className="h-8 w-8 text-blue-500" />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{doc.document_type}</h4>
                          <p className="text-sm text-gray-500">{doc.file_name}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewDocument(doc)}
                        className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        View Document
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientsTab;