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
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600'
    },
    { 
      value: 'verified', 
      label: 'Verified', 
      description: 'Documents verified and approved for travel',
      color: 'bg-green-100 text-green-800 border-green-200',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600'
    },
    { 
      value: 'traveled', 
      label: 'Traveled', 
      description: 'Client has departed for job placement',
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600'
    },
    { 
      value: 'returned', 
      label: 'Returned', 
      description: 'Client has completed assignment and returned',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600'
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md sm:max-w-lg md:max-w-xl mx-auto max-h-[90vh] overflow-hidden">
        {/* Header - Responsive padding and text */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 sm:px-6 py-3 sm:py-4 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <h2 className="text-lg sm:text-xl font-semibold truncate">Update Client Status</h2>
              <p className="text-indigo-100 text-sm sm:text-base truncate">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-white hover:text-gray-200 transition-colors p-1 sm:p-0"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>
        </div>

        {/* Content - Responsive padding and scrollable */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm sm:text-base text-red-800">{error}</p>
            </div>
          )}

          {/* Current Status - Responsive design */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2 sm:mb-3">
              Current Status
            </label>
            <div className={`p-3 sm:p-4 rounded-lg border ${getStatusInfo(currentStatus).bgColor}`}>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <span className={`inline-flex items-center px-2.5 py-1 text-xs sm:text-sm font-medium rounded-full ${getStatusInfo(currentStatus).color} self-start`}>
                  {getStatusInfo(currentStatus).label}
                </span>
                <span className="text-sm sm:text-base text-gray-600 leading-relaxed">
                  {getStatusInfo(currentStatus).description}
                </span>
              </div>
            </div>
          </div>

          {/* New Status Selection - Mobile-optimized */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3 sm:mb-4">
              Update to Status *
            </label>
            <div className="space-y-3 sm:space-y-4">
              {statusOptions.map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-3 sm:p-4 border rounded-lg cursor-pointer transition-all ${
                    selectedStatus === option.value
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={selectedStatus === option.value}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="mt-1 h-4 w-4 sm:h-5 sm:w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                  <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs sm:text-sm font-medium rounded-full ${option.color} self-start`}>
                        {option.label}
                      </span>
                    </div>
                    <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2 leading-relaxed">
                      {option.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Status Change Summary - Mobile-friendly */}
          {selectedStatus !== currentStatus && (
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
                <User className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                <span className="text-sm sm:text-base text-blue-800 leading-relaxed">
                  Status will change from <strong>{getStatusInfo(currentStatus).label}</strong> to <strong>{getStatusInfo(selectedStatus).label}</strong>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Responsive buttons */}
        <div className="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 rounded-b-lg">
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end space-y-3 space-y-reverse sm:space-y-0 sm:space-x-3">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 sm:py-2 text-gray-600 hover:text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateStatus}
              disabled={loading || selectedStatus === currentStatus}
              className={`w-full sm:w-auto px-4 py-2.5 sm:py-2 font-medium rounded-lg transition-colors ${
                loading || selectedStatus === currentStatus
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </div>
              ) : selectedStatus === currentStatus ? (
                'No Change'
              ) : (
                <div className="flex items-center justify-center space-x-2">
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