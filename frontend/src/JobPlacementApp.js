import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, BrowserRouter as Router } from 'react-router-dom';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ClientDashboard from './components/ClientDashboard';
import AdminDashboard from './components/AdminDashboard';
import OnboardingWizard from './components/OnboardingWizard';
import OnboardingCheck from './components/OnboardingCheck';
import AdminClientDetailsPage from './components/AdminClientDetailsPage';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider, useAuth } from './AuthProvider';
import { USER_ROLES } from './constants';  // Removed trailing comma
import APIService from './services/APIService';
import PrivacyPolicy from './components/PrivacyPolicy';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
};

// Auth Page Component
const AuthPage = () => {
  const [isLogin, setIsLogin] = React.useState(true);
  const [authType, setAuthType] = React.useState('client'); // 'client' or 'admin'
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        {/* Auth Type Toggle */}
        <div className="text-center">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 mb-6">
            <button
              onClick={() => setAuthType('client')}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                authType === 'client'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Client Portal
            </button>
            <button
              onClick={() => setAuthType('admin')}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-colors ${
                authType === 'admin'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Admin Portal
            </button>
          </div>
        </div>
        
        {isLogin ? (
          <LoginForm 
            onToggle={() => setIsLogin(false)} 
            isClient={authType === 'client'}
          />
        ) : (
          <RegisterForm 
            onToggle={() => setIsLogin(true)}
            isClient={authType === 'client'}
          />
        )}
      </div>
    </div>
  );
};

// Main App Routes Component
const AppRoutes = () => {
  const { user, loading, initialized, isAdmin, isClient } = useAuth();

  // Show loading spinner while initializing authentication
  if (!initialized || loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {/* Privacy Policy Route - accessible to everyone */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />

      {/* If no user after initialization, show auth page */}
      {!user ? (
        <>
          {/* You can add other public routes here */}
          <Route path="*" element={<AuthPage />} />
        </>
      ) : (
        <>
          {/* Admin Routes */}
          {isAdmin && (
            <>
              <Route
                path="/admin/clients/:clientId"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
                    <AdminClientDetailsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/*"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
            </>
          )}

          {/* Client Routes */}
          {isClient && (
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={[USER_ROLES.CLIENT]}>
                  <OnboardingCheck />
                </ProtectedRoute>
              }
            />
          )}

          {/* Default redirect based on user role */}
          <Route
            path="/"
            element={
              <Navigate 
                to={isAdmin ? "/admin" : "/dashboard"} 
                replace 
              />
            }
          />
          
          {/* Catch all redirect */}
          <Route 
            path="*" 
            element={
              <Navigate 
                to={isAdmin ? "/admin" : "/dashboard"} 
                replace 
              />
            } 
          />
        </>
      )}
    </Routes>
  );
};

// Main App Component
const App = () => (
  <ErrorBoundary>
    <AppRoutes />
  </ErrorBoundary>
);

// Root Application Component
export default function JobPlacementApp() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  );
}