import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthProvider';
import { USER_ROLES } from './constants';
import AdminClientDetailsPage from './components/AdminClientDetailsPage';
import AdminDashboard from './components/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import HomePage from './components/HomePage';
import LoadingSpinner from './components/LoadingSpinner';
import LoginForm from './components/LoginForm';
import OnboardingCheck from './components/OnboardingCheck';
import PasswordChangePage from './components/PasswordChangePage';
import PrivacyPolicy from './components/PrivacyPolicy';
import RegisterForm from './components/RegisterForm';
import UnauthorizedPage from './components/UnauthorizedPage';
import { PortalProvider } from './context/PortalContext';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const AuthPage = ({
  initialMode = 'login',
  title = 'Client And Staff Portal',
  subtitle = 'Sign in with your phone number or email address, or create a client account to begin your application.',
}) => {
  const [isLogin, setIsLogin] = React.useState(initialMode === 'login');

  React.useEffect(() => {
    setIsLogin(initialMode === 'login');
  }, [initialMode]);

  return (
    <div className="min-h-screen bg-[var(--gc-page)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <a href="/" className="flex items-center gap-3">
            <img src="/gulf.png" alt="Gulf Consultant logo" className="h-12 w-12 rounded-2xl border border-slate-200 bg-white p-1" />
            <div>
              <p className="font-bold text-[var(--gc-blue)]">Gulf Consultant</p>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Your Travel Partner</p>
            </div>
          </a>
          <a
            href="tel:+256756527240"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[var(--gc-cyan-strong)] hover:text-[var(--gc-blue)]"
          >
            Call Office
          </a>
        </div>

        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
          <div className="rounded-[32px] bg-[linear-gradient(145deg,_#032a55,_#0057b7_58%,_#16b8dc)] p-8 text-white shadow-[0_34px_110px_-55px_rgba(0,87,183,0.95)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-100">Secure Access</p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-100 sm:text-lg">{subtitle}</p>

            <div className="mt-8 space-y-3">
              {[
                'One login flow for applicants and staff',
                'Role-based access controlled by the backend',
                'Support available from our Nansana office when needed',
              ].map((item) => (
                <div key={item} className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-medium text-slate-100 backdrop-blur">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-md w-full space-y-8 justify-self-center">
            <div className="text-center">
              <p className="text-sm text-slate-500">
                {isLogin ? 'Enter your credentials below to continue.' : 'New applicant? Create your client account below.'}
              </p>
            </div>

            {isLogin ? (
              <LoginForm onToggle={() => setIsLogin(false)} embedded />
            ) : (
              <RegisterForm onToggle={() => setIsLogin(true)} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AppRoutes = () => {
  const { user, loading, initialized, isAdmin, isClient } = useAuth();

  if (!initialized || loading) {
    return <LoadingSpinner fullScreen />;
  }

  return (
    <Routes>
      {!user ? (
        <>
          <Route path="/" element={<HomePage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route
            path="/apply"
            element={
              <AuthPage
                initialMode="register"
                title="Start your online Gulf application"
                subtitle="Create your client account first, then continue to the full digital application form with your personal details, passport information, and job interest."
              />
            }
          />
          <Route
            path="/portal"
            element={
              <AuthPage
                initialMode="login"
                title="Client and staff portal"
                subtitle="Sign in with your phone number or email to continue your application or access your assigned dashboard."
              />
            }
          />
          <Route
            path="/login"
            element={
              <AuthPage
                initialMode="login"
                title="Client and staff portal"
                subtitle="Sign in with your phone number or email to continue your application or access your assigned dashboard."
              />
            }
          />
          <Route
            path="/register"
            element={
              <AuthPage
                initialMode="register"
                title="Create your Gulf Consultant account"
                subtitle="Register as a client to begin the digital version of the Gulf Consultant application process."
              />
            }
          />
          <Route path="/admin-login" element={<Navigate to="/login" replace />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </>
      ) : (
        <>
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <PasswordChangePage />
              </ProtectedRoute>
            }
          />

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

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route
            path="/"
            element={
              <Navigate
                to={user.must_change_password ? "/change-password" : isAdmin ? "/admin" : "/dashboard"}
                replace
              />
            }
          />
          <Route
            path="*"
            element={
              <Navigate
                to={user.must_change_password ? "/change-password" : isAdmin ? "/admin" : "/dashboard"}
                replace
              />
            }
          />
        </>
      )}
    </Routes>
  );
};

const App = () => (
  <ErrorBoundary>
    <AppRoutes />
  </ErrorBoundary>
);

export default function JobPlacementApp() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <PortalProvider>
          <App />
        </PortalProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
