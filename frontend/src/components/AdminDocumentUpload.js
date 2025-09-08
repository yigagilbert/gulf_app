import React, { useState } from 'react';
import { 
  Upload, X, FileText, File, Image, CheckCircle, 
  AlertCircle, RotateCcw 
} from 'lucide-react';
import APIService from '../services/APIService';
import LoadingSpinner from './LoadingSpinner';

const AdminDocumentUpload = ({ clientId, clientName, isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const documentTypes = [
    { value: 'cv', label: 'CV/Resume', description: 'Curriculum Vitae or Resume' },
    { value: 'passport', label: 'Passport', description: 'Passport copy' },
    { value: 'visa', label: 'Visa', description: 'Visa documents' },
    { value: 'certificate', label: 'Certificate', description: 'Educational or professional certificates' },
    { value: 'license', label: 'License', description: 'Professional license or permit' },
    { value: 'id', label: 'ID Card', description: 'National ID or identification card' },
    { value: 'medical', label: 'Medical', description: 'Medical certificates or reports' },
    { value: 'other', label: 'Other', description: 'Other supporting documents' }
  ];

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (fileType?.includes('image')) return <Image className="h-8 w-8 text-blue-500" />;
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (selectedFile) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png', 
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError('Only PDF, DOC, DOCX, and image files are allowed.');
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB.');
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file || !documentType) {
      setError('Please select a file and document type.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      // Remove document_type from FormData since it's passed as query parameter
      
      const response = await APIService.request(`/admin/clients/${clientId}/documents/upload?document_type=${documentType}`, {
        method: 'POST',
        body: formData,
        skipContentType: true // Ensure proper FormData handling
      });

      setSuccess(`Document uploaded successfully for ${clientName}`);
      
      if (onSuccess) {
        onSuccess(response);
      }

      // Reset form
      setFile(null);
      setDocumentType('');
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
        setSuccess(null);
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setDocumentType('');
    setError(null);
    setSuccess(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Overlay */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-xl sm:max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <Upload className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Upload Document
                </h3>
                <p className="text-sm text-gray-600">
                  Upload document for {clientName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          {/* Document Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Document Type *
            </label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select document type</option>
              {documentTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>

          {/* File Upload Area */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload File *
            </label>
            
            {!file ? (
              <div
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="file-upload" className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900">
                        Drop files here or click to upload
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        PDF, DOC, DOCX, JPG, PNG up to 10MB
                      </span>
                    </label>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file.type)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setFile(null)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0 sm:space-x-3">
            <button
              onClick={resetForm}
              disabled={uploading}
              className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset Form
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                disabled={uploading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={!file || !documentType || uploading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
              >
                {uploading ? (
                  <>
                    <LoadingSpinner className="h-4 w-4 mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDocumentUpload;