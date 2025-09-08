import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, User, Mail } from 'lucide-react';
import APIService from '../services/APIService';

const AdminClientDeleteConfirmation = ({ clientId, clientName, clientEmail, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [confirmationText, setConfirmationText] = useState('');

  const expectedConfirmation = 'DELETE';

  const handleDelete = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await APIService.deleteClient(clientId);
      
      if (onSuccess) {
        onSuccess({
          clientId,
          clientName,
          clientEmail,
          response
        });
      }

      onClose();
    } catch (err) {
      console.error('Error deleting client:', err);
      setError(err.message || 'Failed to delete client. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isConfirmationValid = confirmationText === expectedConfirmation;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-4 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-lg font-semibold">Delete Client</h2>
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

          {/* Warning Message */}
          <div className="mb-6">
            <div className="flex items-start space-x-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 mb-2">
                  This action cannot be undone!
                </p>
                <p className="text-sm text-red-700">
                  Deleting this client will permanently remove:
                </p>
                <ul className="text-sm text-red-700 mt-2 space-y-1">
                  <li>• Client profile and personal information</li>
                  <li>• All uploaded documents and files</li>
                  <li>• Chat message history</li>
                  <li>• Job applications and related data</li>
                  <li>• User account and login credentials</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Client Information */}
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Client to be deleted:</h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <User className="h-4 w-4 text-gray-500" />
                <span className="font-medium text-gray-900">{clientName}</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-600">{clientEmail}</span>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type <span className="font-bold text-red-600">{expectedConfirmation}</span> to confirm deletion
            </label>
            <input
              type="text"
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
              placeholder={`Type ${expectedConfirmation} here...`}
              disabled={loading}
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-sm text-red-600 mt-1">
                Confirmation text does not match
              </p>
            )}
          </div>
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
              onClick={handleDelete}
              disabled={loading || !isConfirmationValid}
              className={`px-4 py-2 font-medium rounded-lg transition-colors ${
                loading || !isConfirmationValid
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Deleting...</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Trash2 className="h-4 w-4" />
                  <span>Delete Client</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminClientDeleteConfirmation;