// constants.js
export const USER_ROLES = {
  CLIENT: 'client',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin'
};

export const STORAGE_KEYS = {
  USER: 'user',
  AUTH_TOKEN: 'authToken',
  SESSION: 'gulf_consultants_session',  // Added for consistency with AuthProvider
  THEME_PREFERENCE: 'themePreference',
  LAST_ACTIVITY: 'lastActivity'
};

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  CLIENT_DASHBOARD: '/dashboard',
  CLIENT_PROFILE: '/profile',
  CLIENT_DOCUMENTS: '/documents',
  CLIENT_JOBS: '/jobs',
  CLIENT_APPLICATIONS: '/applications',
  ADMIN_DASHBOARD: '/admin',
  ADMIN_CLIENTS: '/admin/clients',
  ADMIN_CLIENT_DETAILS: '/admin/clients/:clientId',
  ADMIN_JOBS: '/admin/jobs',
  ADMIN_APPLICATIONS: '/admin/applications',
  ADMIN_ANALYTICS: '/admin/analytics',
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404'
};

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY: '/auth/verify'
  },
  PROFILE: '/api/profile',
  DOCUMENTS: '/api/documents',
  JOBS: '/api/jobs',
  APPLICATIONS: '/api/applications',
  ADMIN: {
    CLIENTS: '/api/admin/clients',
    JOBS: '/api/admin/jobs',
    APPLICATIONS: '/api/admin/applications',
    ANALYTICS: '/api/admin/analytics'
  }
};

export const APPLICATION_STATUS = {
  PENDING: 'pending',
  UNDER_REVIEW: 'under_review',
  INTERVIEW: 'interview',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

export const CLIENT_STATUS = {
  NEW: 'new',
  UNDER_REVIEW: 'under_review',
  VERIFIED: 'verified',
  IN_PROGRESS: 'in_progress',
  PLACED: 'placed',
  TRAVELED: 'traveled',
  INACTIVE: 'inactive'
};

export const DOCUMENT_TYPES = {
  CV: 'cv',
  PHOTO: 'photo',
  PASSPORT: 'passport',
  NIN_CARD: 'nin_card',
  CERTIFICATE: 'certificate',
  MEDICAL: 'medical',
  POLICE_CLEARANCE: 'police_clearance'
};

export const JOB_TYPES = {
  FULL_TIME: 'full_time',
  PART_TIME: 'part_time',
  CONTRACT: 'contract',
  TEMPORARY: 'temporary'
};

export const VALIDATION_RULES = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 50,
  PHONE_PATTERN: /^\+?\d{7,15}$/,
  NIN_MIN_LENGTH: 5,
  PASSPORT_MIN_LENGTH: 5,
  EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  DATE_PATTERN: /^\d{4}-\d{2}-\d{2}$/
};

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'Your session has expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SERVER_ERROR: 'A server error occurred. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.'
};

export const UI_CONFIG = {
  TOAST_DURATION: 5000,
  LOADING_TIMEOUT: 30000,
  DEBOUNCE_DELAY: 300,
  PAGINATION_SIZE: 20,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'],
  SESSION_TIMEOUT: 30 * 60 * 1000 // 30 minutes
};