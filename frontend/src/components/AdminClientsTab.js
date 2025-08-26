import React, { useState } from 'react';
import { Download, Check, X, Search } from 'lucide-react';
import APIService from '../services/APIService';

const AdminClientsTab = ({ clients, onVerifyClient, onDownloadDocument }) => {
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDocuments, setClientDocuments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [error, setError] = useState(null);

  const filteredClients = clients.filter(client => {
    const matchesSearch = (client.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          client.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = !statusFilter || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const loadClientDocuments = async (clientId) => {
    setLoadingDocuments(true);
    setError(null);
    try {
      // FIXED: Use the proper APIService method
      const documents = await APIService.getClientDocuments(clientId);
      setClientDocuments(documents);
    } catch (error) {
      console.error('Error loading client documents:', error);
      setError(error.message);
      setClientDocuments([]); // Reset to empty array on error
    } finally {
      setLoadingDocuments(false);
    }
  };

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    if (client) {
      loadClientDocuments(client.id);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      new: 'bg-gray-100 text-gray-800',
      under_review: 'bg-yellow-100 text-yellow-800',
      verified: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      placed: 'bg-purple-100 text-purple-800',
      traveled: 'bg-indigo-100 text-indigo-800',
      inactive: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.new;
  };

  // Add loading state for documents section
  const renderDocumentsSection = () => {
    if (loadingDocuments) {
      return <div className="text-center py-4">Loading documents...</div>;
    }

    if (error) {
      return (
        <div className="text-red-600 text-sm py-4">
          Error loading documents: {error}
        </div>
      );
    }

    if (clientDocuments.length === 0) {
      return <p className="text-gray-500 text-sm">No documents uploaded</p>;
    }

    return (
      <div className="space-y-2">
        {clientDocuments.map(doc => (
          // Your existing document JSX
          <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Documents</h4>
                {clientDocuments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {clientDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-xs text-gray-600">{doc.file_name}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            doc.is_verified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.is_verified ? 'Verified' : 'Pending'}
                          </span>
                          <button
                            onClick={() => onDownloadDocument(doc.id, doc.file_name)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
            </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Client Management</h2>
        
        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="under_review">Under Review</option>
            <option value="verified">Verified</option>
            <option value="in_progress">In Progress</option>
            <option value="placed">Placed</option>
            <option value="traveled">Traveled</option>
          </select>
        </div>
      </div>

      <div className="flex h-96">
        {/* Client List */}
        <div className="w-1/2 border-r overflow-y-auto">
          {filteredClients.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No clients found.</p>
          ) : (
            <div className="divide-y">
              {filteredClients.map(client => (
                <div
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedClient?.id === client.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {client.first_name} {client.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">{client.user?.email}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Joined: {new Date(client.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
                      {client.status?.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Client Details */}
        <div className="w-1/2 p-4 overflow-y-auto">
          {selectedClient ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Client Details</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Full Name</label>
                    <p className="text-gray-900">
                      {selectedClient.first_name} {selectedClient.middle_name} {selectedClient.last_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Email</label>
                    <p className="text-gray-900">{selectedClient.user?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Phone</label>
                    <p className="text-gray-900">{selectedClient.phone_primary || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">NIN</label>
                    <p className="text-gray-900">{selectedClient.nin || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Passport</label>
                    <p className="text-gray-900">{selectedClient.passport_number || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Documents</h4>
                {clientDocuments.length === 0 ? (
                  <p className="text-gray-500 text-sm">No documents uploaded</p>
                ) : (
                  <div className="space-y-2">
                    {clientDocuments.map(doc => (
                      <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.document_type.replace('_', ' ').toUpperCase()}</p>
                          <p className="text-xs text-gray-600">{doc.file_name}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            doc.is_verified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {doc.is_verified ? 'Verified' : 'Pending'}
                          </span>
                          <button
                            onClick={() => onDownloadDocument(doc.id, doc.file_name)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification Actions */}
              {selectedClient.status !== 'verified' && (
                <div>
                  <button
                    onClick={() => onVerifyClient(selectedClient.id, 'Client verified by admin')}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Verify Client
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Select a client to view details</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminClientsTab;