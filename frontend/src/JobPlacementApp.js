
import React, { createContext, useContext, useState, useEffect } from 'react';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import ClientDashboard from './components/ClientDashboard';
import AdminDashboard from './components/AdminDashboard';
import APIService from './services/APIService';

// Auth Context
const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // FIXED: Properly handle user authentication state
  const checkAuthState = async () => {
    const token = APIService.getAuthToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      // Try to get profile first to validate token
      const profile = await APIService.getProfile();
      
      // Set user from profile data - handle the user relationship properly
      if (profile) {
        setUser({
          id: profile.user_id,
          email: profile.user?.email || 'Unknown', // Handle missing user relation
          role: 'client' // Default role, should be fetched from user endpoint
        });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      APIService.clearAuthToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuthState();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await APIService.login({ email, password });
      
      // FIXED: Set user from login response directly
      if (response.user) {
        setUser(response.user);
      } else {
        // Fallback: fetch profile after login
        await checkAuthState();
      }
    } catch (error) {
      console.error('Login error:', error);
      APIService.clearAuthToken();
      setUser(null);
      throw error; // Re-throw with original error message
    }
  };

  const register = async (email, password) => {
    try {
      await APIService.register({ email, password });
      // Don't auto-login after registration to match your success message pattern
    } catch (error) {
      console.error('Registration error:', error);
      throw error; // Re-throw with original error message
    }
  };

  const logout = async () => {
    await APIService.logout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  return isLogin ? (
    <LoginForm onToggle={() => setIsLogin(false)} />
  ) : (
    <RegisterForm onToggle={() => setIsLogin(true)} />
  );
};

const App = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  if (!user) {
    return <AuthPage />;
  }
  return user.role === 'admin' || user.role === 'super_admin' ? (
    <AdminDashboard />
  ) : (
    <ClientDashboard />
  );
};

export default function JobPlacementApp() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
}