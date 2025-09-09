import React, { useState } from 'react';
import { 
  X, Download, ZoomIn, ZoomOut, RotateCw, 
  ChevronLeft, ChevronRight, FileText, AlertCircle,
  Maximize2, Minimize2
} from 'lucide-react';

const PDFViewer = ({ isOpen, onClose, fileUrl, fileName }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = fileUrl;
    link.download = fileName || 'document';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  const getFileExtension = (filename) => {
    return filename?.split('.').pop()?.toLowerCase() || '';
  };

  const isImageFile = (filename) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageExtensions.includes(getFileExtension(filename));
  };

  const isPDFFile = (filename) => {
    return getFileExtension(filename) === 'pdf';
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 bg-black bg-opacity-90 ${fullscreen ? 'z-[60]' : ''}`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-gray-900 text-white">
          <div className="flex items-center space-x-3">
            <FileText className="h-6 w-6" />
            <div>
              <h3 className="font-medium">{fileName || 'Document'}</h3>
              <p className="text-sm text-gray-300">
                {isPDFFile(fileName) ? 'PDF Document' : 
                 isImageFile(fileName) ? 'Image File' : 'Document'}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2">
            {/* Zoom Controls */}
            <button
              onClick={handleZoomOut}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            
            <span className="text-sm px-2 py-1 bg-gray-700 rounded">
              {Math.round(zoom * 100)}%
            </span>
            
            <button
              onClick={handleZoomIn}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Rotate"
            >
              <RotateCw className="h-5 w-5" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={() => setFullscreen(!fullscreen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title={fullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
            </button>

            {/* Download */}
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="h-5 w-5" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-4">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading document...</p>
            </div>
          )}

          {error && (
            <div className="text-center max-w-md">
              <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Unable to load document</h3>
              <p className="text-gray-600 mb-4">
                The document could not be displayed. You can try downloading it instead.
              </p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Download className="h-4 w-4 mr-2 inline" />
                Download Document
              </button>
            </div>
          )}

          {!loading && !error && (
            <div 
              className="max-w-full max-h-full"
              style={{
                transform: `scale(${zoom}) rotate(${rotation}deg)`,
                transformOrigin: 'center center',
                transition: 'transform 0.2s ease-in-out'
              }}
            >
              {isPDFFile(fileName) ? (
                <iframe
                  src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="w-[800px] h-[600px] border-0 bg-white shadow-lg"
                  onLoad={handleLoad}
                  onError={handleError}
                  title={fileName}
                />
              ) : isImageFile(fileName) ? (
                <img
                  src={fileUrl}
                  alt={fileName}
                  className="max-w-full max-h-full object-contain shadow-lg"
                  onLoad={handleLoad}
                  onError={handleError}
                />
              ) : (
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Document Preview</h3>
                  <p className="text-gray-600 mb-4">
                    Preview is not available for this file type. You can download it to view the content.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4 mr-2 inline" />
                    Download Document
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-900 text-white text-center">
          <p className="text-sm text-gray-300">
            Use the controls above to zoom, rotate, or download the document
          </p>
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;