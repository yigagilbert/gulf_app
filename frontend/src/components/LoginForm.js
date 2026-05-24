import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, Lock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthProvider';

const LoginForm = ({ onToggle, embedded = false }) => {
  const { login, loading, error } = useAuth();
  const [formData, setFormData] = useState({
    identifier: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const errors = {};

    if (!formData.identifier.trim()) {
      errors.identifier = 'Email or phone number is required';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const errors = validateForm();
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await login({
        identifier: formData.identifier.trim(),
        password: formData.password
      });
    } catch (err) {
      // Error state is managed by AuthProvider.
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value
    }));

    if (formErrors[name]) {
      setFormErrors((current) => ({
        ...current,
        [name]: ''
      }));
    }
  };

  const wrapperClass = 'max-w-md w-full space-y-8';

  return (
    <div className={embedded ? wrapperClass : 'min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12'}>
      <div className={embedded ? '' : wrapperClass}>
        <div className="text-center">
          <div className={`mx-auto mb-4 flex items-center justify-center ${embedded ? 'h-28 w-28' : 'h-40 w-40'}`}>
            <img
              src="/gulf.png"
              alt="Gulf Consultant logo"
              className="h-full w-full object-contain"
            />
          </div>
          <h2 className={`mb-2 font-bold text-gray-900 ${embedded ? 'text-2xl' : 'text-3xl'}`}>
            Sign In
          </h2>
          <p className="text-gray-600">
            Use your phone number or email address to continue.
          </p>
        </div>

        {error && (
          <div className="flex items-start space-x-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Sign in failed</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="space-y-2">
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700">
                Email or Phone Number
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.identifier}
                  onChange={handleChange}
                  className={`block w-full rounded-lg border py-3 pl-10 pr-3 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                    formErrors.identifier
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Enter your phone number or email"
                />
              </div>
              {formErrors.identifier && (
                <p className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  {formErrors.identifier}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`block w-full rounded-lg border py-3 pl-10 pr-10 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm ${
                    formErrors.password
                      ? 'border-red-300 bg-red-50'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {formErrors.password && (
                <p className="mt-1 flex items-center text-sm text-red-600">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  {formErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || isSubmitting}
              className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-3 font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
        </form>

        {onToggle && (
          <div className="text-center">
            <p className="text-sm text-gray-600">
              New applicant?{' '}
              <button
                type="button"
                onClick={onToggle}
                className="font-medium text-blue-600 hover:text-blue-700"
              >
                Create your client account
              </button>
            </p>
          </div>
        )}

        <div className="text-center">
          <Link to="/privacy-policy" className="text-sm text-gray-500 hover:text-gray-700">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginForm;
