import { useState, useMemo } from 'react';
import { Eye, EyeOff, Mail, Lock, User, CheckCircle, XCircle, AlertCircle, Loader, Phone } from 'lucide-react';
import { useAuth } from '../AuthProvider';
import { validateEmail, validatePassword } from '../utils/validation';
import { VALIDATION_RULES } from '../constants';

// Enhanced Registration Form for Clients
const RegisterForm = ({ onToggle, isClient = true }) => {
  const [formData, setFormData] = useState({
    phone_number: '',
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    acceptTerms: false
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationStates, setValidationStates] = useState({});
  const [success, setSuccess] = useState(false);

  const { register } = useAuth();

  // Password requirements - updated for 7+ characters
  const passwordRequirements = useMemo(() => {
    const password = formData.password;
    return [
      { text: 'More than 6 characters', met: password.length > 6 },
      { text: 'One lowercase letter', met: /[a-z]/.test(password) },
      { text: 'One uppercase letter', met: /[A-Z]/.test(password) },
      { text: 'One number', met: /\d/.test(password) }
    ];
  }, [formData.password]);

  // Real-time validation
  const validateField = (name, value) => {
    switch (name) {
      case 'first_name':
      case 'last_name':
        if (!value.trim()) return `${name === 'first_name' ? 'First' : 'Last'} name is required`;
        if (value.trim().length < 2) return `${name === 'first_name' ? 'First' : 'Last'} name must be at least 2 characters`;
        return '';

      case 'phone_number':
        if (!value.trim()) return 'Phone number is required';
        if (value.trim().length < 10) return 'Phone number must be at least 10 characters';
        return '';

      case 'email':
        // Email is optional for clients
        if (value && !validateEmail(value)) return 'Please enter a valid email address';
        return '';
      
      case 'password':
        if (!value) return 'Password is required';
        if (value.length <= 6) return 'Password must be more than 6 characters';
        return '';
      
      case 'confirmPassword':
        if (!value) return 'Please confirm your password';
        if (value !== formData.password) return 'Passwords do not match';
        return '';

      case 'acceptTerms':
        return value ? '' : 'You must accept the terms and conditions';
      
      default:
        return '';
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Real-time validation for specific fields
    if (name === 'email' && value) {
      setValidationStates(prev => ({
        ...prev,
        [name]: validateEmail(value) ? 'valid' : 'invalid'
      }));
    } else if (name === 'password' && value) {
      setValidationStates(prev => ({
        ...prev,
        [name]: value.length > 6 ? 'valid' : 'invalid'
      }));
    } else if (name === 'phone_number' && value) {
      setValidationStates(prev => ({
        ...prev,
        [name]: value.length >= 10 ? 'valid' : 'invalid'
      }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  };

  const isFormValid = Object.values(errors).every(error => !error) &&
    Object.keys(formData).every(key => {
      if (key === 'acceptTerms') return formData[key];
      return !!formData[key].trim();
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrors({});
    setSuccess(false);

    // Full validation before submit
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
      const registrationData = isClient ? {
        // Client registration data
        phone_number: formData.phone_number,
        email: formData.email || undefined, // Optional for clients
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name
      } : {
        // Admin registration data (if needed)
        email: formData.email,
        password: formData.password
      };
      
      await register(registrationData, isClient);
      setSuccess(true);
      // Optionally toggle to login or redirect
    } catch (err) {
      setErrors({ general: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
      <div className="text-center mb-8">
        <div className="mx-auto h-20 w-20 mb-4 flex items-center justify-center">
          <img 
            src="https://customer-assets.emergentagent.com/job_mobile-recruit/artifacts/58ezwzoy_gulf.png" 
            alt="Gulf Consultants Logo" 
            className="h-full w-full object-contain"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Join Gulf Consultants
        </h2>
        <p className="text-gray-600">
          Create your account to access exclusive job opportunities
        </p>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-lg flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          Account created successfully! Please log in.
        </div>
      )}

      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">First Name</label>
            <input
              type="text"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="John"
              required
              disabled={loading}
            />
            {errors.first_name && (
              <div className="flex items-center text-sm text-red-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.first_name}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Last Name</label>
            <input
              type="text"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="Doe"
              required
              disabled={loading}
            />
            {errors.last_name && (
              <div className="flex items-center text-sm text-red-600 mt-1">
                <AlertCircle className="h-4 w-4 mr-1" />
                {errors.last_name}
              </div>
            )}
          </div>
        </div>

        {/* Phone Number - Primary Field */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Phone Number <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="tel"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="1234567890"
              required
              disabled={loading}
            />
            <Phone className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {validationStates.phone_number && (
              <div className="absolute right-3 top-2.5">
                {validationStates.phone_number === 'valid' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              </div>
            )}
          </div>
          {errors.phone_number && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.phone_number}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">This will be your username for login</p>
        </div>

        {/* Email - Optional */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Email <span className="text-gray-400">(Optional)</span>
          </label>
          <div className="relative">
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="you@example.com"
              disabled={loading}
            />
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            {validationStates.email && (
              <div className="absolute right-3 top-2.5">
                {validationStates.email === 'valid' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
              </div>
            )}
          </div>
          {errors.email && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.email}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">For notifications and communication</p>
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.password}
            </div>
          )}
          <div className="mt-2 space-y-1">
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center text-xs">
                {req.met ? <CheckCircle className="h-4 w-4 text-green-500 mr-1" /> : <XCircle className="h-4 w-4 text-gray-300 mr-1" />}
                {req.text}
              </div>
            ))}
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              className="w-full px-3 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="••••••••"
              required
              disabled={loading}
            />
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <div className="flex items-center text-sm text-red-600 mt-1">
              <AlertCircle className="h-4 w-4 mr-1" />
              {errors.confirmPassword}
            </div>
          )}
        </div>

        {/* Terms acceptance */}
        <div className="flex items-start">
          <input
            type="checkbox"
            name="acceptTerms"
            checked={formData.acceptTerms}
            onChange={handleChange}
            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded mt-1"
            disabled={loading}
          />
          <label className="ml-3 text-sm text-gray-700">
            I accept the{' '}
            <a href="#" className="text-green-600 hover:text-green-500 underline">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="text-green-600 hover:text-green-500 underline">
              Privacy Policy
            </a>
          </label>
        </div>
        {errors.acceptTerms && (
          <div className="flex items-center text-sm text-red-600">
            <AlertCircle className="h-4 w-4 mr-1" />
            {errors.acceptTerms}
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading || !isFormValid}
          className={`
            w-full flex items-center justify-center px-4 py-3 rounded-lg text-white font-medium
            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500
            ${loading || !isFormValid 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-green-600 hover:bg-green-700 active:bg-green-800 shadow-lg hover:shadow-xl'
            }
          `}
        >
          {loading ? (
            <>
              <Loader className="animate-spin -ml-1 mr-3 h-5 w-5" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-gray-600 text-sm">
          Already have an account?{' '}
          <button
            onClick={onToggle}
            className="text-green-600 hover:text-green-500 font-medium focus:outline-none focus:underline"
            disabled={loading}
          >
            Sign in instead
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

export default RegisterForm;