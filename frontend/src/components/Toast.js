import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const Toast = ({ 
  type = 'info', 
  message, 
  duration = 5000, 
  onClose,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Allow fade out animation
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const typeConfig = {
    success: {
      icon: CheckCircle,
      colors: 'bg-green-50 border-green-200 text-green-800',
      iconColor: 'text-green-500'
    },
    error: {
      icon: AlertCircle,
      colors: 'bg-red-50 border-red-200 text-red-800',
      iconColor: 'text-red-500'
    },
    warning: {
      icon: AlertTriangle,
      colors: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      iconColor: 'text-yellow-500'
    },
    info: {
      icon: Info,
      colors: 'bg-blue-50 border-blue-200 text-blue-800',
      iconColor: 'text-blue-500'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
    }`}>
      <div className={`
        max-w-sm w-full border rounded-lg p-4 shadow-lg
        ${config.colors} ${className}
      `}>
        <div className="flex items-start">
          <Icon className={`h-5 w-5 mr-3 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
          <div className="flex-1">
            <p className="text-sm font-medium">{message}</p>
          </div>
          <button
            onClick={handleClose}
            className="ml-3 flex-shrink-0 hover:opacity-70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ToastProvider component for managing multiple toasts
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  return (
    <>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </>
  );
};

export default Toast;