import React, { useState } from 'react';
import { X, User, Calendar, CheckCircle } from 'lucide-react';
import APIService from '../services/APIService';

const AdminClientStatusUpdate = ({ clientId, clientName, currentStatus, isOpen, onClose, onSuccess }) => {
  const [selectedStatus, setSelectedStatus] = useState(currentStatus || 'new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = [
    { 
      value: 'new', 
      label: 'New', 
      description: 'Recently registered client',
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      bgColor: 'bg-blue-50'
    },
    { 
      value: 'verified', 
      label: 'Verified', 
      description: 'Documents verified and approved for travel',
      color: 'bg-green-100 text-green-800 border-green-200',
      bgColor: 'bg-green-50'
    },
    { 
      value: 'traveled', 
      label: 'Traveled', 
      description: 'Client has departed for job placement',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bgColor: 'bg-yellow-50'
    },
    { 
      value: 'returned', 
      label: 'Returned', 
      description: 'Client has completed assignment and returned',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      bgColor: 'bg-purple-50'
    }
  ];

  const handleUpdateStatus = async () => {
    if (selectedStatus === currentStatus) {
      onClose();
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await APIService.updateClientStatus(clientId, selectedStatus);
      
      if (onSuccess) {
        onSuccess({
          clientId,
          oldStatus: currentStatus,
          newStatus: selectedStatus,
          response
        });
      }

      onClose();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err.message || 'Failed to update client status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    return statusOptions.find(option => option.value === status) || statusOptions[0];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Update Client Status</h2>
              <p className="text-indigo-100 text-sm">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Current Status */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Status
            </label>
            <div className={`p-3 rounded-lg border ${getStatusInfo(currentStatus).bgColor}`}>
              <div className="flex items-center space-x-2">
                <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusInfo(currentStatus).color}`}>
                  {getStatusInfo(currentStatus).label}
                </span>
                <span className="text-sm text-gray-600">
                  {getStatusInfo(currentStatus).description}
                </span>
              </div>
            </div>
          </div>

          {/* New Status Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Update to Status *
            </label>
            <div className="space-y-3">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedStatus === option.value
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="ml-3 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${option.color}`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status Change Summary */}
          {selectedStatus !== currentStatus && (
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-blue-600" />
                <span className="text-blue-800">
                  Status will change from <strong>{getStatusInfo(currentStatus).label}</strong> to <strong>{getStatusInfo(selectedStatus).label}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg">
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={loading || selectedStatus === currentStatus}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                loading || selectedStatus === currentStatus
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </div>
              ) : selectedStatus === currentStatus ? (
                'No Change'
              ) : (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4" />
                  <span>Update Status</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminClientStatusUpdate;