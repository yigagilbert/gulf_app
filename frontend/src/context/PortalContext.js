import React, { createContext, useContext, useMemo, useState } from 'react';

const PortalContext = createContext(null);

export const PortalProvider = ({ children }) => {
  const [documentPreview, setDocumentPreview] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const value = useMemo(() => ({
    documentPreview,
    unreadMessages,
    openDocumentPreview: (payload) => setDocumentPreview(payload),
    closeDocumentPreview: () => setDocumentPreview(null),
    setUnreadMessages,
  }), [documentPreview, unreadMessages]);

  return <PortalContext.Provider value={value}>{children}</PortalContext.Provider>;
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
