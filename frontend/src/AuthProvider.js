import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import APIService ,{ APIError } from './services/APIService';
import { USER_ROLES, STORAGE_KEYS } from './constants';  // Updated to use STORAGE_KEYS.SESSION
import { logger } from './utils/logger';
import { validateUser, sanitizeUserData } from './utils/validation';
import { secureStorage } from './utils/storage';  // Added import for consolidated storage

// Enhanced Auth Context
const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth state management
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  LOGOUT: 'LOGOUT',
  SET_INITIALIZED: 'SET_INITIALIZED'
};

const initialAuthState = {
  user: null,
  loading: true,
  error: null,
  initialized: false,
  sessionExpiry: null
};

const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case AUTH_ACTIONS.SET_USER:
      return { 
        ...state, 
        user: action.payload, 
        error: null, 
        loading: false,
        sessionExpiry: action.expiry || null
      };
    
    case AUTH_ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };
    
    case AUTH_ACTIONS.CLEAR_ERROR:
      return { ...state, error: null };
    
    case AUTH_ACTIONS.LOGOUT:
      return { ...initialAuthState, loading: false, initialized: true };
    
    case AUTH_ACTIONS.SET_INITIALIZED:
      return { ...state, initialized: true };
    
    default:
      return state;
  }
};

// Session management utilities (consolidated to use secureStorage; removed duplicate timestamp/version logic)
const SESSION_CHECK_INTERVAL = 60000; // Check every minute

class SessionManager {
  static setSession(user, expiry = null) {
    try {
      const sessionData = {
        user: sanitizeUserData(user),
        expiry: expiry || Date.now() + (24 * 60 * 60 * 1000), // Default 24 hours
      };
      
      secureStorage.setItem(STORAGE_KEYS.SESSION, sessionData);
      return sessionData;
    } catch (error) {
      logger.error('Failed to save session:', error);
      return null;
    }
  }

  static getSession() {
    try {
      const sessionData = secureStorage.getItem(STORAGE_KEYS.SESSION);
      if (!sessionData) return null;

      // Check if session is expired
      if (sessionData.expiry && Date.now() > sessionData.expiry) {
        this.clearSession();
        return null;
      }

      return sessionData;
    } catch (error) {
      logger.error('Failed to read session:', error);
      this.clearSession();
      return null;
    }
  }

  static clearSession() {
    try {
      secureStorage.removeItem(STORAGE_KEYS.SESSION);
    } catch (error) {
      logger.error('Failed to clear session:', error);
    }
  }

  static isSessionValid() {
    const session = this.getSession();
    return session && session.user && validateUser(session.user);
  }
}

// Enhanced Auth Provider
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = React.useReducer(authReducer, initialAuthState);
  const sessionCheckRef = useRef(null);
  const refreshTokenRef = useRef(null);

  const clearError = useCallback(() => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }, []);

  const setError = useCallback((error) => {
    const errorMessage = error instanceof APIError ? error.message : 
                        typeof error === 'string' ? error :
                        'An unexpected error occurred';
    
    dispatch({ type: AUTH_ACTIONS.SET_ERROR, payload: errorMessage });
    logger.error('Auth error:', error);
  }, []);

  const setLoading = useCallback((loading) => {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: loading });
  }, []);

  const setUser = useCallback((user, expiry = null) => {
    if (user && validateUser(user)) {
      const sanitizedUser = sanitizeUserData(user);
      SessionManager.setSession(sanitizedUser, expiry);
      dispatch({ 
        type: AUTH_ACTIONS.SET_USER, 
        payload: sanitizedUser,
        expiry 
      });
      logger.info('User authenticated successfully');
    } else {
      logger.warn('Invalid user data provided to setUser');
      setError('Invalid user data received');
    }
  }, [setError]);

  const logout = useCallback(async (reason = 'user_initiated') => {
    setLoading(true);
    
    try {
      // Clear session check interval
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
        sessionCheckRef.current = null;
      }

      // Clear refresh token timeout
      if (refreshTokenRef.current) {
        clearTimeout(refreshTokenRef.current);
        refreshTokenRef.current = null;
      }

      // Only call API logout if it's user initiated
      if (reason === 'user_initiated') {
        try {
          await APIService.logout();
        } catch (error) {
          logger.warn('Logout API call failed:', error);
        }
      }

      // Clear local data
      SessionManager.clearSession();
      APIService.clearAuthToken();  // Inferred completion from truncation
    } finally {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
      setLoading(false);
    }
  }, [setLoading]);

  const checkAuthState = useCallback(async () => {
    const token = APIService.getAuthToken();
    
    if (!token) {
      await logout('no_token');
      return;
    }

    if (APIService.isTokenExpired()) {
      await logout('token_expired');
      return;
    }
  }, [setUser, setError, logout]);

  const login = useCallback(async (credentials) => {
    if (!credentials?.email || !credentials?.password) {
      throw new APIError('Email and password are required', 400, null, 'validation');
    }

    setLoading(true);
    clearError();

    try {
      const response = await APIService.login(credentials);
      console.log('Raw API login response:', response);
      
      if (response?.user) {
        console.log('User data from response:', response.user);
        
        setUser(response.user);
      } else {
        console.log('No user data in response, attempting profile check');
      }
      
    } catch (error) {
      console.error('Login error details:', error);
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setUser, setError]);

  const register = useCallback(async (userData) => {
    if (!userData?.email || !userData?.password) {
      throw new APIError('Email and password are required', 400, null, 'validation');
    }

    setLoading(true);
    clearError();

    try {
      const response = await APIService.register(userData);
      logger.info('User registered successfully');
      return response;
    } catch (error) {
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setError]);

  const refreshAuth = useCallback(async () => {
    try {
      await APIService.refreshToken();
      await checkAuthState();
    } catch (error) {
      logger.error('Token refresh failed:', error);
      await logout('refresh_failed');
    }
  }, [checkAuthState, logout]);

  // Setup periodic session validation
  const startSessionCheck = useCallback(() => {
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
    }

    sessionCheckRef.current = setInterval(() => {
      if (!SessionManager.isSessionValid() || APIService.isTokenExpired()) {
        logout('session_expired');
      }
    }, SESSION_CHECK_INTERVAL);
  }, [logout]);

  // Setup automatic token refresh
  const scheduleTokenRefresh = useCallback(() => {
    const token = APIService.getAuthToken();
    if (!token) return;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      const refreshTime = expiry - Date.now() - (5 * 60 * 1000); // Refresh 5 minutes before expiry

      if (refreshTime > 0) {
        refreshTokenRef.current = setTimeout(() => {
          refreshAuth();
        }, refreshTime);
      }
    } catch (error) {
      logger.warn('Failed to schedule token refresh:', error);
    }
  }, [refreshAuth]);

  // Initialize authentication state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const session = SessionManager.getSession();
        
        if (session && session.user) {
          setUser(session.user, session.expiry);
          startSessionCheck();
          scheduleTokenRefresh();
        } else {
          await checkAuthState();
        }
      } catch (error) {
        logger.error('Failed to initialize auth:', error);
        setError('Failed to initialize authentication');
      } finally {
        dispatch({ type: AUTH_ACTIONS.SET_INITIALIZED });
      }
    };

    initializeAuth();

    const SESSION_STORAGE_KEY = STORAGE_KEYS.SESSION;
    
    // Listen for storage changes (multi-tab support)
    const handleStorageChange = (e) => {
      if (e.key === SESSION_STORAGE_KEY) {
        if (!e.newValue) {
          // Session cleared in another tab
          logout('session_cleared_elsewhere');
        } else {
          // Session updated in another tab
          try {
            const newSession = JSON.parse(e.newValue);
            if (newSession.user) {
              setUser(newSession.user, newSession.expiry);
            }
          } catch (error) {
            logger.error('Failed to parse session from storage change:', error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (sessionCheckRef.current) {
        clearInterval(sessionCheckRef.current);
      }
      if (refreshTokenRef.current) {
        clearTimeout(refreshTokenRef.current);
      }
    };
  }, [checkAuthState, setUser, setError, logout, startSessionCheck, scheduleTokenRefresh]);

  // Start session monitoring when user logs in
  useEffect(() => {
    if (state.user && state.initialized) {
      startSessionCheck();
      scheduleTokenRefresh();
    }
  }, [state.user, state.initialized, startSessionCheck, scheduleTokenRefresh]);

  // Enhanced context value with additional utilities
  const contextValue = {
    // Core auth state
    user: state.user,
    loading: state.loading,
    error: state.error,
    initialized: state.initialized,

    // Auth actions
    login,
    register,
    logout,
    refreshAuth,
    clearError,

    // Auth status helpers
    isAuthenticated: !!state.user,
    isAdmin: state.user?.role === USER_ROLES.ADMIN || state.user?.role === USER_ROLES.SUPER_ADMIN,
    isSuperAdmin: state.user?.role === USER_ROLES.SUPER_ADMIN,
    isClient: state.user?.role === USER_ROLES.CLIENT,

    // Session info
    sessionExpiry: state.sessionExpiry,
    isSessionValid: () => SessionManager.isSessionValid(),

    // Utility functions
    hasPermission: (requiredRoles) => {
      if (!state.user) return false;
      if (Array.isArray(requiredRoles)) {
        return requiredRoles.includes(state.user.role);
      }
      return state.user.role === requiredRoles;
    },

    getUserDisplayName: () => {
      if (!state.user) return 'Guest';
      const firstName = state.user.firstName || '';
      const lastName = state.user.lastName || '';
      if (firstName || lastName) {
        return `${firstName} ${lastName}`.trim();
      }
      return state.user.email || 'User';
    }
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Enhanced auth hook with additional utilities
export const useAuthState = () => {
  const auth = useAuth();
  
  return {
    ...auth,
    
    // Additional computed properties
    canAccessAdmin: auth.isAdmin || auth.isSuperAdmin,
    canManageUsers: auth.isSuperAdmin,
    
    // Role checking utilities
    requireAuth: () => {
      if (!auth.isAuthenticated) {
        throw new Error('Authentication required');
      }
    },
    
    requireRole: (role) => {
      auth.requireAuth();
      if (!auth.hasPermission(role)) {
        throw new Error('Insufficient permissions');
      }
    },
    
    // Session utilities
    getTimeUntilExpiry: () => {
      if (!auth.sessionExpiry) return null;
      const timeLeft = auth.sessionExpiry - Date.now();
      return timeLeft > 0 ? timeLeft : 0;
    },
    
    isSessionExpiring: (minutesThreshold = 5) => {
      const timeLeft = auth.getTimeUntilExpiry?.();
      return timeLeft && timeLeft < (minutesThreshold * 60 * 1000);
    }
  };
};

// Higher-order component for auth protection
export const withAuth = (WrappedComponent, allowedRoles = null) => {
  return function AuthenticatedComponent(props) {
    const auth = useAuth();

    if (!auth.initialized) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (!auth.isAuthenticated) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600">Please log in to access this page.</p>
          </div>
        </div>
      );
    }

    if (allowedRoles && !auth.hasPermission(allowedRoles)) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h2>
            <p className="text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };
};

export default AuthProvider;