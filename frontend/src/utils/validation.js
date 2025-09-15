// utils/validation.js
import { VALIDATION_RULES, USER_ROLES } from '../constants';

export const validateUser = (user) => {
  if (!user || typeof user !== 'object') return false;
  
  // More lenient validation - allow string IDs and normalize roles
  const hasValidId = user.id && (typeof user.id === 'number' || typeof user.id === 'string');
  const hasValidEmail = user.email && typeof user.email === 'string' && VALIDATION_RULES.EMAIL_PATTERN.test(user.email);
  const hasValidRole = user.role && typeof user.role === 'string';
  
  return Boolean(hasValidId && hasValidEmail && hasValidRole);
};

export const sanitizeUserData = (user) => {
  if (!user) return null;
  
  // Normalize role to match USER_ROLES constants
  const normalizeRole = (role) => {
    if (!role) return USER_ROLES.CLIENT; // Default to client
    
    const roleStr = String(role).toLowerCase();
    
    // Map common API role variations to USER_ROLES constants
    const roleMapping = {
      'admin': USER_ROLES.ADMIN,
      'administrator': USER_ROLES.ADMIN,
      'super_admin': USER_ROLES.SUPER_ADMIN,
      'superadmin': USER_ROLES.SUPER_ADMIN,
      'super-admin': USER_ROLES.SUPER_ADMIN,
      'client': USER_ROLES.CLIENT,
      'user': USER_ROLES.CLIENT,
      'customer': USER_ROLES.CLIENT
    };
    
    return roleMapping[roleStr] || roleStr; // Return mapped value or original if no mapping
  };
  
  return {
    id: Number(user.id), // Convert to number
    email: String(user.email).toLowerCase().trim(),
    role: normalizeRole(user.role),
    firstName: user.firstName ? String(user.firstName).trim() : null,
    lastName: user.lastName ? String(user.lastName).trim() : null,
    lastLoginAt: user.lastLoginAt || new Date().toISOString(),
    isActive: Boolean(user.isActive ?? true)
  };
};

export const validateEmail = (email) => {
  return VALIDATION_RULES.EMAIL_PATTERN.test(email);
};

export const validatePassword = (password) => {
  const errors = [];
  
  if (!password || password.length < VALIDATION_RULES.PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters long`);
  }
  
  if (!/(?=.*[a-z])/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/(?=.*[A-Z])/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/(?=.*\d)/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateProfileData = (data) => {
  const errors = [];
  
  if (!data.first_name || data.first_name.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    errors.push('First name is required and must be at least 2 characters');
  }
  
  if (!data.last_name || data.last_name.length < VALIDATION_RULES.NAME_MIN_LENGTH) {
    errors.push('Last name is required and must be at least 2 characters');
  }
  
  if (data.date_of_birth && !VALIDATION_RULES.DATE_PATTERN.test(data.date_of_birth)) {
    errors.push('Date of birth must be in YYYY-MM-DD format');
  }
  
  if (data.passport_expiry && !VALIDATION_RULES.DATE_PATTERN.test(data.passport_expiry)) {
    errors.push('Passport expiry must be in YYYY-MM-DD format');
  }
  
  if (data.phone_primary && !VALIDATION_RULES.PHONE_PATTERN.test(data.phone_primary)) {
    errors.push('Primary phone number format is invalid');
  }
  
  if (data.nin && data.nin.length < VALIDATION_RULES.NIN_MIN_LENGTH) {
    errors.push('NIN must be at least 5 characters');
  }
  
  if (data.passport_number && data.passport_number.length < VALIDATION_RULES.PASSPORT_MIN_LENGTH) {
    errors.push('Passport number must be at least 5 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const sanitizeString = (str, maxLength = 255) => {
  if (!str || typeof str !== 'string') return null;
  return str.trim().slice(0, maxLength);
};

export const formatCurrency = (amount, currency = 'UGx') => {
  if (!amount && amount !== 0) return 'N/A';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return 'Invalid Date';
  }
};

export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
};