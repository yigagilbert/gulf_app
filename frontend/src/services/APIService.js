/**
 * Professional API Service for Gulf Consultants Job Placement System
 * Enhanced with robust session management and token handling
 */

// Configuration
const API_CONFIG = {
  BASE_URL: 'https://onboard-gulf.preview.emergentagent.com/api', // Force production backend URL
  TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png', 
    'image/jpg',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],
  MAX_RETRIES: 3,
  RETRY_DELAYS: [1000, 2000, 4000], // Exponential backoff
  QUEUE_LIMIT: 10
};

// Debug logging for environment configuration
console.log('🔧 API Configuration:', {
  BASE_URL: API_CONFIG.BASE_URL,
  ENV_VAR: process.env.REACT_APP_BACKEND_URL,
  NODE_ENV: process.env.NODE_ENV
});

/**
 * Enhanced API Error class with better categorization
 */
class APIError extends Error {
  constructor(message, status, response = null, type = 'generic') {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
    this.type = type;
    this.timestamp = new Date().toISOString();
  }

  get isNetworkError() {
    return this.type === 'network' || this.status === 0;
  }

  get isAuthError() {
    return this.status === 401 || this.status === 403;
  }

  get isValidationError() {
    return this.status === 422 || this.status === 400;
  }

  get isServerError() {
    return this.status >= 500;
  }

  get isRetryable() {
    return this.isNetworkError || this.isServerError || this.status === 429;
  }
}

/**
 * Request Queue Manager for handling concurrent requests
 */
class RequestQueue {
  constructor(limit = API_CONFIG.QUEUE_LIMIT) {
    this.limit = limit;
    this.running = [];
    this.queue = [];
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject
      });
      this.process();
    });
  }

  async process() {
    if (this.running.length >= this.limit || this.queue.length === 0) {
      return;
    }

    const { requestFn, resolve, reject } = this.queue.shift();
    const runningItem = { resolve, reject };
    this.running.push(runningItem);

    try {
      const result = await requestFn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      const index = this.running.indexOf(runningItem);
      if (index > -1) {
        this.running.splice(index, 1);
      }
      this.process(); // Process next item in queue
    }
  }
}

/**
 * Enhanced API Service with robust session management
 */
class APIServiceClass {
  constructor() {
    this.requestQueue = new RequestQueue();
    this.authToken = null;
    this.baseURL = API_CONFIG.BASE_URL;
    this.requestId = 0;
  }

  /**
   * Set authentication token
   */
  setAuthToken(token) {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
  }

  /**
   * Get current auth token
   */
  getAuthToken() {
    return this.authToken;
  }

  /**
   * Create request headers with authentication
   */
  createHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }

    return headers;
  }

  /**
   * Handle response with comprehensive error handling
   */
  async handleResponse(response, requestId) {
    const contentType = response.headers.get('content-type');
    
    try {
      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        let errorData = null;
        
        if (contentType && contentType.includes('application/json')) {
          try {
            errorData = await response.json();
            errorMessage = errorData.detail || errorData.message || errorMessage;
          } catch (parseError) {
            console.warn(`[${requestId}] Failed to parse error response as JSON:`, parseError);
          }
        }

        // Determine error type
        let errorType = 'generic';
        if (response.status === 0 || !response.status) {
          errorType = 'network';
          errorMessage = 'Network error. Please check your connection.';
        } else if (response.status === 401) {
          errorType = 'auth';
          errorMessage = 'Authentication required. Please log in again.';
        } else if (response.status === 403) {
          errorType = 'auth';
          errorMessage = 'Access denied. You do not have permission to perform this action.';
        } else if (response.status === 404) {
          errorMessage = 'Resource not found.';
        } else if (response.status >= 500) {
          errorType = 'server';
          errorMessage = 'Server error. Please try again later.';
        }

        throw new APIError(errorMessage, response.status, errorData, errorType);
      }

      // Handle successful response
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else {
        return await response.text();
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle parsing errors
      console.error(`[${requestId}] Response parsing error:`, error);
      throw new APIError('Failed to process server response', response.status, null, 'parse');
    }
  }

  /**
   * Make HTTP request with retry logic and error handling
   */
  async _makeRequest(endpoint, options = {}) {
    const requestId = ++this.requestId;
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    
    console.log(`[${requestId}] Making request to:`, url);

    const requestOptions = {
      method: 'GET',
      headers: this.createHeaders(options.headers),
      ...options
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete requestOptions.headers['Content-Type'];
    }

    let lastError;
    
    for (let attempt = 0; attempt <= API_CONFIG.MAX_RETRIES; attempt++) {
      try {
        console.log(`[${requestId}] Attempt ${attempt + 1}/${API_CONFIG.MAX_RETRIES + 1}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);
        
        const response = await fetch(url, {
          ...requestOptions,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const result = await this.handleResponse(response, requestId);
        console.log(`[${requestId}] Request successful`);
        return result;
        
      } catch (error) {
        lastError = error;
        console.error(`[${requestId}] Attempt ${attempt + 1} failed:`, error.message);
        
        // Don't retry auth errors or validation errors
        if (error.isAuthError || error.isValidationError || !error.isRetryable) {
          break;
        }
        
        // Don't retry on the last attempt
        if (attempt < API_CONFIG.MAX_RETRIES) {
          const delay = API_CONFIG.RETRY_DELAYS[attempt] || API_CONFIG.RETRY_DELAYS[API_CONFIG.RETRY_DELAYS.length - 1];
          console.log(`[${requestId}] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`[${requestId}] All attempts failed`);
    throw lastError || new APIError('Request failed after all retry attempts', 0, null, 'network');
  }

  /**
   * Queue request for processing
   */
  async request(endpoint, options = {}) {
    return this.requestQueue.add(() => this._makeRequest(endpoint, options));
  }

  /**
   * Authentication endpoints
   */
  async login(credentials) {
    try {
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      });
      
      if (response && response.access_token) {
        this.setAuthToken(response.access_token);
      }
      
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  async register(userData) {
    try {
      const response = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData)
      });
      
      if (response && response.access_token) {
        this.setAuthToken(response.access_token);
      }
      
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Profile endpoints
   */
  async getProfile() {
    return this.request('/profile/me');
  }

  async updateProfile(profileData) {
    return this.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  async uploadProfilePhoto(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.request('/profile/me/photo', {
      method: 'POST',
      body: formData
    });
  }

  async getOnboardingStatus() {
    return this.request('/profile/me/onboarding-status');
  }

  /**
   * Document endpoints
   */
  async getDocuments() {
    return this.request('/documents/me');
  }

  async uploadDocument(file, documentType) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    
    return this.request('/documents/upload', {
      method: 'POST',
      body: formData
    });
  }

  /**
   * Job endpoints
   */
  async getJobs(page = 1, limit = 20) {
    return this.request(`/jobs?page=${page}&limit=${limit}`);
  }

  async getJob(jobId) {
    return this.request(`/jobs/${jobId}`);
  }

  async applyForJob(jobId, applicationData = {}) {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST',
      body: JSON.stringify(applicationData)
    });
  }

  async getMyApplications() {
    return this.request('/applications/me');
  }

  /**
   * Chat endpoints
   */
  async sendChatMessage(receiverId, content) {
    return this.request('/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        receiver_id: receiverId,
        content: content
      })
    });
  }

  async getChatHistory(userId) {
    return this.request(`/chat/history?user_id=${userId}`);
  }

  /**
   * Admin endpoints
   */
  async getClients() {
    return this.request('/admin/clients');
  }

  async createClient(clientData) {
    return this.request('/admin/clients/create', {
      method: 'POST',
      body: JSON.stringify(clientData)
    });
  }

  async getAdminInbox() {
    return this.request('/chat/admin/inbox');
  }

  async getAllApplications() {
    return this.request('/admin/applications');
  }

  /**
   * File validation utilities
   */
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > API_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File size exceeds ${API_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB limit`);
    }
    
    if (!API_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }
    
    return true;
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const response = await this.request('/health', { method: 'GET' });
      return response;
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', message: error.message };
    }
  }
}

// Create singleton instance
const APIService = new APIServiceClass();

// Export for convenience
export { APIError };
export default APIService;