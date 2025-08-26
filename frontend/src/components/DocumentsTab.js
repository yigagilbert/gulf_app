import React, { useState } from 'react';
import { Upload, Download, User, FileText } from 'lucide-react';
import APIService from '../services/APIService';

const DocumentsTab = ({ documents, onUpdate }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const documentType = event.target.dataset.type;
    
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // FIXED: Use proper APIService method with progress tracking
      await APIService.uploadDocument(file, documentType, (progress) => {
        setUploadProgress(progress);
      });
      
      await onUpdate(); // Refresh data after successful upload
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      // Reset file input
      event.target.value = '';
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      // FIXED: Use proper APIService method
      await APIService.downloadDocument(documentId, fileName);
    } catch (error) {
      console.error('Download failed:', error);
      setError(error.message);
    }
  };

  // Add error display to the component
  const renderErrorMessage = () => {
    if (!error) return null;
    
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
        {error}
        <button 
          onClick={() => setError(null)}
          className="ml-2 text-red-900 hover:text-red-700"
        >
          ×
        </button>
      </div>
    );
  };

  const documentTypes = [
    { key: 'cv', label: 'CV/Resume', icon: FileText },
    { key: 'photo', label: 'Profile Photo', icon: User },
    { key: 'passport', label: 'Passport', icon: FileText },
    { key: 'nin_card', label: 'NIN Card', icon: FileText },
    { key: 'certificate', label: 'Certificates', icon: FileText },
    { key: 'medical', label: 'Medical Reports', icon: FileText },
    { key: 'police_clearance', label: 'Police Clearance', icon: FileText },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Documents</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documentTypes.map(({ key, label, icon: Icon }) => {
          const document = documents.find(doc => doc.document_type === key);
          
          return (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center mb-4">
                <Icon className="h-6 w-6 text-gray-600 mr-3" />
                <h3 className="font-medium text-gray-900">{label}</h3>
              </div>

              {document ? (
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="truncate">{document.file_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                      document.is_verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {document.is_verified ? 'Verified' : 'Pending'}
                    </span>
                    <button
                      onClick={() => handleDownload(document.id, document.file_name)}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">No document uploaded</p>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      data-type={key}
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      disabled={uploading}
                    />
                    <div className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload'}
                    </div>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DocumentsTab;
