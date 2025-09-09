// components/ConfirmDialog.js
import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to continue?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const typeConfig = {
    warning: {
      colors: 'bg-yellow-50 text-yellow-800',
      buttonColors: 'bg-yellow-600 hover:bg-yellow-700'
    },
    danger: {
      colors: 'bg-red-50 text-red-800',
      buttonColors: 'bg-red-600 hover:bg-red-700'
    },
    info: {
      colors: 'bg-blue-50 text-blue-800',
      buttonColors: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const config = typeConfig[type];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center mb-4">
            <div className={`rounded-full p-2 ${config.colors} mr-3`}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 text-white rounded-lg ${config.buttonColors}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;