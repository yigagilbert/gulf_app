import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import APIService, { APIError } from './services/APIService';
import { USER_ROLES } from './constants';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Enhanced Storage Manager with better persistence
class StorageManager {
  static TOKEN_KEY = 'gulf_consultants_token';
  static USER_KEY = 'gulf_consultants_user';
  static EXPIRY_KEY = 'gulf_consultants_expiry';
  static LAST_ACTIVITY_KEY = 'gulf_consultants_last_activity';

  static setAuthData(token, user, expiresIn = 7 * 24 * 60 * 60 * 1000) { // 7 days default
    try {
      const expiryTime = Date.now() + expiresIn;
      const lastActivity = Date.now();
      
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
      localStorage.setItem(this.EXPIRY_KEY, expiryTime.toString());
      localStorage.setItem(this.LAST_ACTIVITY_KEY, lastActivity.toString());
      
      // Also store in sessionStorage as backup
      sessionStorage.setItem(this.TOKEN_KEY, token);
      sessionStorage.setItem(this.USER_KEY, JSON.stringify(user));
      
      return true;
    } catch (error) {
      console.error('Failed to store auth data:', error);
      return false;
    }
  }

  static getAuthData() {
    try {
      // Try localStorage first, then sessionStorage
      let token = localStorage.getItem(this.TOKEN_KEY) || sessionStorage.getItem(this.TOKEN_KEY);
      let userStr = localStorage.getItem(this.USER_KEY) || sessionStorage.getItem(this.USER_KEY);
      let expiryStr = localStorage.getItem(this.EXPIRY_KEY);
      let lastActivityStr = localStorage.getItem(this.LAST_ACTIVITY_KEY);

      if (!token || !userStr) {
        return null;
      }

      const user = JSON.parse(userStr);
      const expiry = expiryStr ? parseInt(expiryStr) : null;
      const lastActivity = lastActivityStr ? parseInt(lastActivityStr) : Date.now();

      // Check if token is expired (with 1 hour grace period for clock skew)
      const gracePeriod = 60 * 60 * 1000; // 1 hour
      if (expiry && Date.now() > (expiry + gracePeriod)) {
        console.log('Token expired beyond grace period, clearing');
        this.clearAuthData();
        return null;
      }

      // Check for inactivity (48 hours instead of 24 for more tolerance)
      const inactivityLimit = 48 * 60 * 60 * 1000; // 48 hours
      if (Date.now() - lastActivity > inactivityLimit) {
        console.log('User inactive beyond limit, clearing session');
        this.clearAuthData();
        return null;
      }

      // Update last activity
      this.updateLastActivity();

      return { token, user, expiry };
    } catch (error) {
      console.error('Failed to get auth data:', error);
      // Don't clear auth data on parsing errors - might be temporary
      return null;
    }
  }

  static updateLastActivity() {
    try {
      const now = Date.now().toString();
      localStorage.setItem(this.LAST_ACTIVITY_KEY, now);
    } catch (error) {
      console.error('Failed to update last activity:', error);
    }
  }

  static clearAuthData() {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      localStorage.removeItem(this.EXPIRY_KEY);
      localStorage.removeItem(this.LAST_ACTIVITY_KEY);
      
      sessionStorage.removeItem(this.TOKEN_KEY);
      sessionStorage.removeItem(this.USER_KEY);
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  static isTokenValid() {
    const authData = this.getAuthData();
    return authData && authData.token && authData.user;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const activityTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);

  const logout = useCallback(() => {
    try {
      console.log('Logging out user...');
      
      // Clear timeouts and intervals
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      // Clear storage and API token
      StorageManager.clearAuthData();
      APIService.clearAuthToken();
      
      // Reset state
      setUser(null);
      setError(null);
      
      console.log('Logout completed');
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Track user activity
  const updateActivity = useCallback(() => {
    StorageManager.updateLastActivity();
    
    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Set new timeout for 30 minutes of inactivity
    activityTimeoutRef.current = setTimeout(() => {
      console.log('User inactive for 30 minutes, logging out...');
      logout();
    }, 30 * 60 * 1000); // 30 minutes
  }, [logout]);

  // Set up activity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const throttledUpdateActivity = throttle(updateActivity, 60000); // Update every minute max
    
    events.forEach(event => {
      document.addEventListener(event, throttledUpdateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledUpdateActivity, true);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [updateActivity]);

  // Initialize auth state from storage - ONLY RUN ONCE
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        setLoading(true);
        const authData = StorageManager.getAuthData();
        
        if (authData && authData.token && authData.user) {
          console.log('Found stored auth data, restoring session...');
          
          // Set the token in APIService
          APIService.setAuthToken(authData.token);
          
          // For initial load, trust the stored session and set user immediately
          setUser(authData.user);
          updateActivity();
          console.log('Session restored from storage');
          
          // Verify token in background without affecting current session
          setTimeout(async () => {
            try {
              await APIService.request('/profile/me', { method: 'GET' });
              console.log('Background token verification successful');
            } catch (apiError) {
              console.log('Background token verification failed:', apiError);
              
              // Only clear session for explicit auth errors
              if (apiError.isAuthError && (apiError.status === 401 || apiError.status === 403)) {
                console.log('Token expired, logging out...');
                logout();
              }
            }
          }, 2000);
        } else {
          console.log('No stored auth data found');
        }
      } catch (error) {
        console.error('Failed to initialize auth:', error);
        setError('Failed to restore session');
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    // Only run once on mount
    if (!initialized) {
      initializeAuth();
    }
  }, [initialized]); // Only depend on initialized flag to avoid infinite loops

  // Set up heartbeat to keep session alive
  useEffect(() => {
    if (user) {
      // Send heartbeat every 10 minutes to keep session active
      heartbeatIntervalRef.current = setInterval(async () => {
        try {
          await APIService.request('/profile/me', { method: 'GET' });
          updateActivity();
        } catch (error) {
          console.log('Heartbeat failed, user may need to re-login');
        }
      }, 10 * 60 * 1000); // 10 minutes

      return () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
      };
    }
  }, [user, updateActivity]);

  const login = useCallback(async (credentials) => {
    try {
      setLoading(true);
      setError(null);

      const response = await APIService.login(credentials);
      
      if (response && response.access_token && response.user) {
        // Store auth data with extended expiry (7 days)
        const stored = StorageManager.setAuthData(
          response.access_token, 
          response.user, 
          7 * 24 * 60 * 60 * 1000 // 7 days
        );
        
        if (stored) {
          APIService.setAuthToken(response.access_token);
          setUser(response.user);
          updateActivity(); // Start activity tracking
          console.log('Login successful, session stored');
        } else {
          throw new Error('Failed to store session data');
        }
      } else {
        throw new Error('Invalid login response');
      }
    } catch (err) {
      console.error('Login error:', err);
      const errorMessage = err instanceof APIError ? err.message : 
                          typeof err === 'string' ? err : 
                          'Login failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateActivity]);

  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await APIService.register(userData);
      
      if (response && response.access_token && response.user) {
        // Store auth data
        const stored = StorageManager.setAuthData(
          response.access_token, 
          response.user, 
          7 * 24 * 60 * 60 * 1000 // 7 days
        );
        
        if (stored) {
          APIService.setAuthToken(response.access_token);
          setUser(response.user);
          updateActivity();
          console.log('Registration successful, session stored');
        } else {
          throw new Error('Failed to store session data');
        }
      } else {
        throw new Error('Invalid registration response');
      }
    } catch (err) {
      console.error('Registration error:', err);
      const errorMessage = err instanceof APIError ? err.message : 
                          typeof err === 'string' ? err : 
                          'Registration failed. Please try again.';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [updateActivity]);

  const refreshSession = useCallback(async () => {
    try {
      if (!user) return false;
      
      const response = await APIService.request('/profile/me', { method: 'GET' });
      if (response) {
        updateActivity();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      logout();
      return false;
    }
  }, [user, updateActivity, logout]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Helper functions
  const isAuthenticated = Boolean(user);
  const isAdmin = user?.role === USER_ROLES.ADMIN || user?.role === USER_ROLES.SUPER_ADMIN;
  const isClient = user?.role === USER_ROLES.CLIENT;

  const value = {
    user,
    loading,
    error,
    initialized,
    isAuthenticated,
    isAdmin,
    isClient,
    login,
    register,
    logout,
    clearError,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Utility function for throttling
function throttle(func, limit) {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }
}