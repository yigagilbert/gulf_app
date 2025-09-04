import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // <-- Add this import
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, XCircle, AlertCircle, Loader } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { validateEmail, validatePassword } from '../utils/validation';

// Enhanced Input Component with validation
const FormInput = ({ 
  type = 'text', 
  label, 
  name, 
  value, 
  onChange, 
  onBlur,
  error, 
  icon: Icon, 
  placeholder,
  required = false,
  disabled = false,
  showPasswordToggle = false,
  onPasswordToggle,
  showPassword = false,
  validationState = null // 'valid', 'invalid', 'loading'
}) => {
  const [focused, setFocused] = useState(false);

  const getValidationIcon = () => {
    switch (validationState) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'invalid':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'loading':
        return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    if (error) return 'border-red-300 focus:border-red-500 focus:ring-red-500';
    if (validationState === 'valid') return 'border-green-300 focus:border-green-500 focus:ring-green-500';
    if (focused) return 'border-blue-500 focus:ring-blue-500';
    return 'border-gray-300 focus:border-blue-500 focus:ring-blue-500';
  };

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        
        <input
          type={showPasswordToggle && !showPassword ? 'password' : type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            block w-full px-3 py-3 rounded-lg transition-colors duration-200
            ${Icon ? 'pl-10' : 'pl-3'}
            ${showPasswordToggle || validationState ? 'pr-12' : 'pr-3'}
            ${getBorderColor()}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          `}
          required={required}
        />
        
        {showPasswordToggle && (
          <button
            type="button"
            onClick={onPasswordToggle}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          >
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        )}
        
        {validationState && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {getValidationIcon()}
          </div>
        )}
      </div>
      
      {error && (
        <div className="flex items-center text-sm text-red-600 mt-1">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}
    </div>
  );
};

const LoginForm = ({ onToggle }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationStates, setValidationStates] = useState({});
  const [rememberMe, setRememberMe] = useState(false);
  const [loginAttempted, setLoginAttempted] = useState(false);
  const navigate = useNavigate();
  const { login, user, isAuthenticated } = useAuth();

  // Handle navigation after successful authentication
  useEffect(() => {
    if (loginAttempted && isAuthenticated && user) {
      console.log('Login successful, redirecting user with role:', user.role); // Debug log
      
      if (user.role === 'admin' || user.role === 'super_admin') {
        navigate('/admin', { replace: true });
      } else if (user.role === 'client') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      
      setLoginAttempted(false); // Reset flag
    }
  }, [loginAttempted, isAuthenticated, user, navigate]);

  const validateField = useCallback((name, value) => {
    switch (name) {
      case 'email':
        if (!value) return 'Email is required';
        if (!validateEmail(value)) return 'Please enter a valid email address';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        const passwordValidation = validatePassword(value);
        return passwordValidation.isValid ? '' : passwordValidation.errors[0];
      
      default:
        return '';
    }
  }, []);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    if (name === 'email' && value) {
      setValidationStates(prev => ({
        ...prev,
        [name]: validateEmail(value) ? 'valid' : 'invalid'
      }));
    } else if (name === 'password' && value) {
      const passwordValidation = validatePassword(value);
      setValidationStates(prev => ({
        ...prev,
        [name]: passwordValidation.isValid ? 'valid' : 'invalid'
      }));
    }
  }, [errors]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [validateField]);

  const isFormValid = useMemo(() => {
    return Object.values(errors).every(error => !error) &&
      formData.email && formData.password;
  }, [errors, formData]);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});

    let hasErrors = false;
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }

    try {
      await login({ email: formData.email, password: formData.password });
      setLoginAttempted(true); // Set flag to trigger navigation in useEffect
    } catch (err) {
      console.error('Login error:', err); // Debug log
      setErrors({ general: err.message || 'Login failed. Please check your credentials.' });
      setLoginAttempted(false);
    } finally {
      setLoading(false);
    }
  }, [formData, login, validateField]);

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign In</h2>
        <p className="text-gray-600">Access your job placement dashboard</p>
      </div>

      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <FormInput
          type="email"
          label="Email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.email}
          icon={Mail}
          placeholder="you@example.com"
          validationState={validationStates.email}
          required
          disabled={loading}
        />

        {/* Password */}
        <FormInput
          type="password"
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          onBlur={handleBlur}
          error={errors.password}
          icon={Lock}
          placeholder="••••••••"
          showPasswordToggle={true}
          onPasswordToggle={() => setShowPassword(!showPassword)}
          showPassword={showPassword}
          validationState={validationStates.password}
          required
          disabled={loading}
        />

        {/* Remember me and forgot password */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              disabled={loading}
            />
            <span className="ml-2 text-sm text-gray-700">Remember me</span>
          </label>
          
          <button
            type="button"
            className="text-sm text-blue-600 hover:text-blue-500 focus:outline-none focus:underline"
            disabled={loading}
          >
            Forgot password?
          </button>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className={`
            w-full flex items-center justify-center px-4 py-3 rounded-lg text-white font-medium
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
            ${loading || !isFormValid 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl'
            }
          `}
        >
          {loading ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 text-sm">
          Don't have an account?{' '}
          <button
            onClick={onToggle}
            className="text-blue-600 hover:text-blue-500 font-medium focus:outline-none focus:underline"
            disabled={loading}
          >
            Create one now
          </button>
        </p>
      </div>

      {/* Security notice */}
      <div className="mt-6 text-center">
        <p className="text-xs text-gray-500">
          🔒 Your information is secure and encrypted
        </p>
      </div>
    </div>
  );
};
export default LoginForm;