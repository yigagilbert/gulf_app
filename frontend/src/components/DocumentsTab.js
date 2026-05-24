import React, { useState } from 'react';
import { Upload, Download, User, FileText, Eye } from 'lucide-react';
import APIService from '../services/APIService';
import EmptyState from './EmptyState';
import PDFViewer from './PDFViewer';
import StatusBadge from './StatusBadge';

const DocumentsTab = ({ documents = [], onUpdate, onDocumentsUpdate, onDataReload }) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewDocument, setPreviewDocument] = useState(null);

  const refreshDocuments = async () => {
    if (typeof onDataReload === 'function') {
      await onDataReload();
      return;
    }

    if (typeof onUpdate === 'function') {
      await onUpdate();
      return;
    }

    if (typeof onDocumentsUpdate === 'function') {
      const latestDocuments = await APIService.getDocuments();
      onDocumentsUpdate(latestDocuments || []);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    const documentType = event.target.dataset.type;
    
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      await APIService.uploadDocument(file, documentType);
      await refreshDocuments();
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.message);
    } finally {
      setUploading(false);
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

  const handlePreview = async (document) => {
    try {
      const preview = await APIService.getDocumentPreview(document.id);
      setPreviewDocument({
        fileName: preview.file_name,
        fileUrl: `data:${preview.mime_type};base64,${preview.file_base64}`,
        allowDownload: preview.allow_download,
      });
    } catch (previewError) {
      setError(previewError.message);
    }
  };

  const documentTypes = [
    { key: 'cv', label: 'CV/Resume', icon: FileText },
    { key: 'photo', label: 'Profile Photo', icon: User },
    { key: 'passport', label: 'Passport', icon: FileText },
    { key: 'nin_card', label: 'National ID', icon: FileText },
    { key: 'certificate', label: 'Certificates', icon: FileText },
    { key: 'medical', label: 'Medical Reports', icon: FileText },
    { key: 'police_clearance', label: 'Police Clearance', icon: FileText },
  ];

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Documents</h2>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-900 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

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
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={document.status || (document.is_verified ? 'verified' : 'pending')} />
                      {document.access_level ? <StatusBadge value={document.access_level} /> : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePreview(document)}
                        className="text-slate-600 hover:text-slate-800"
                        aria-label="Preview document"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {document.access_level !== 'view_only' ? (
                        <button
                          onClick={() => handleDownload(document.id, document.file_name)}
                          className="text-blue-600 hover:text-blue-700"
                          aria-label="Download document"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
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

      {documents.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={FileText}
            title="No documents uploaded yet"
            description="Upload your required documents here so our team can review your application faster."
            tone="soft"
          />
        </div>
      ) : null}

      {previewDocument ? (
        <PDFViewer
          isOpen={Boolean(previewDocument)}
          onClose={() => setPreviewDocument(null)}
          fileUrl={previewDocument.fileUrl}
          fileName={previewDocument.fileName}
          allowDownload={previewDocument.allowDownload}
        />
      ) : null}
    </div>
  );
};

export default DocumentsTab;
