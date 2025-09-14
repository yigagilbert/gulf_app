import React, { useState, useEffect } from 'react';
import { 
  X, 
  FileText, 
  Download, 
  Trash2, 
  CheckCircle, 
  XCircle,
  Eye,
  Calendar,
  User,
  File
} from 'lucide-react';
import APIService from '../services/APIService';

const AdminClientDocuments = ({ clientId, clientName, isOpen, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showPDFViewer, setShowPDFViewer] = useState(false);

  useEffect(() => {
    if (isOpen && clientId) {
      loadDocuments();
    }
  }, [isOpen, clientId]);

  const loadDocuments = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await APIService.getClientDocuments(clientId);
      setDocuments(response || []);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDocument = async (documentId, isVerified) => {
    try {
      await APIService.verifyDocument(documentId, isVerified);
      // Reload documents to get updated verification status
      await loadDocuments();
    } catch (err) {
      console.error('Error verifying document:', err);
      setError('Failed to update document verification status.');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await APIService.deleteClientDocument(clientId, documentId);
      await loadDocuments(); // Reload the list
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document. Please try again.');
    }
  };

  const handleViewDocument = async (document) => {
    try {
      const response = await APIService.getClientDocumentFile(document.id);
      // response: { file_base64, mime_type, file_name }
      setSelectedDocument({
        ...document,
        file_base64: response.file_base64,
        mime_type: response.mime_type,
        file_name: response.file_name,
      });
      setShowPDFViewer(true);
    } catch (err) {
      alert('Failed to preview document');
    }
  };

  const previewDocument = async (documentId) => {
    try {
      const response = await APIService.getClientDocumentFile(documentId);
      // response: { file_base64, mime_type, file_name }
      const fileUrl = `data:${response.mime_type};base64,${response.file_base64}`;
      // For images/PDFs, you can open in a new tab or show in a modal
      window.open(fileUrl, '_blank');
    } catch (err) {
      alert('Failed to preview document');
    }
  };

  const handleDownloadDocument = async (document) => {
    try {
      const response = await APIService.getClientDocumentFile(document.id);
      const link = document.createElement('a');
      link.href = `data:${response.mime_type};base64,${response.file_base64}`;
      link.download = response.file_name || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to download document');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDocumentTypeLabel = (type) => {
    const typeLabels = {
      passport: 'Passport',
      visa: 'Visa',
      certificate: 'Certificate',
      license: 'License',
      id: 'ID Card',
      medical: 'Medical',
      cv: 'CV/Resume',
      other: 'Other'
    };
    return typeLabels[type] || type;
  };

  const getDocumentIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Client Documents</h2>
              <p className="text-blue-100 text-sm">{clientName}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Loading documents...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No documents uploaded yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Use the upload button in the client list to add documents
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <div
                  key={document.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getDocumentIcon(document.mime_type)}
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {document.file_name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                          <span className="flex items-center">
                            <File className="h-4 w-4 mr-1" />
                            {getDocumentTypeLabel(document.document_type)}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(document.uploaded_at)}
                          </span>
                          {document.file_size && (
                            <span>{formatFileSize(document.file_size)}</span>
                          )}
                        </div>
                        
                        {/* Verification Status */}
                        <div className="mt-2">
                          {document.is_verified ? (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Verified
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending Verification
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewDocument(document)}
                        className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-50"
                        title="View Document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDownloadDocument(document)}
                        className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                        title="Download Document"
                      >
                        <Download className="h-4 w-4" />
                      </button>

                      {document.is_verified ? (
                        <button
                          onClick={() => handleVerifyDocument(document.id, false)}
                          className="text-yellow-600 hover:text-yellow-700 p-1 rounded hover:bg-yellow-50"
                          title="Mark as Unverified"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleVerifyDocument(document.id, true)}
                          className="text-green-600 hover:text-green-700 p-1 rounded hover:bg-green-50"
                          title="Mark as Verified"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteDocument(document.id)}
                        className="text-red-600 hover:text-red-700 p-1 rounded hover:bg-red-50"
                        title="Delete Document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              {documents.length} document{documents.length !== 1 ? 's' : ''} total
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-700 font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* PDF Viewer Modal */}
      {showPDFViewer && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[95vh] overflow-hidden">
            <div className="bg-gray-800 px-4 py-3 text-white flex items-center justify-between">
              <h3 className="font-medium">{selectedDocument.file_name}</h3>
              <button
                onClick={() => setShowPDFViewer(false)}
                className="text-white hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(95vh-60px)]">
              <iframe
                src={`data:${selectedDocument.mime_type};base64,${selectedDocument.file_base64}`}
                className="w-full h-full"
                title={selectedDocument.file_name}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminClientDocuments;