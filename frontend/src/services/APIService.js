/**
 * Professional API Service for Gulf Consultants Job Placement System
 * Enhanced with robust session management and token handling
 */

// Configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_BACKEND_URL || 'https://mobile-recruit.preview.emergentagent.com',
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
}

/**
 * Request queue manager for handling concurrent requests
 */
class RequestQueue {
  constructor(maxConcurrent = 5) {
    this.queue = [];
    this.running = [];
    this.maxConcurrent = maxConcurrent;
  }

  async add(requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ requestFn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running.length >= this.maxConcurrent || this.queue.length === 0) {
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
      this.running = this.running.filter(item => item !== runningItem);
      this.process(); // Process next item
    }
  }
}

/**
 * Professional API Service Class
 */
class APIService {
  static requestQueue = new RequestQueue();
  static authListeners = new Set();
  static requestInterceptors = [];
  static responseInterceptors = [];

  /**
   * Add authentication state listener
   */
  static onAuthChange(callback) {
    this.authListeners.add(callback);
    return () => this.authListeners.delete(callback);
  }

  /**
   * Notify auth listeners of authentication changes
   */
  static notifyAuthChange(isAuthenticated, user = null) {
    this.authListeners.forEach(callback => {
      try {
        callback(isAuthenticated, user);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * Enhanced token management with encryption-like obfuscation (consolidated to secureStorage)
   */
  static getAuthToken() {
    try {
      const token = secureStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (!token) return null;
      
      // Simple validation
      if (token.split('.').length !== 3) {
        this.clearAuthToken();
        return null;
      }
      
      return token;
    } catch (error) {
      console.warn('Failed to retrieve token:', error);
      return null;
    }
  }

  static setAuthToken(token) {
    try {
      if (token) {
        secureStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      } else {
        this.clearAuthToken();
      }
    } catch (error) {
      console.error('Failed to store token:', error);
      throw new APIError('Failed to store authentication token', 0, null, 'storage');
    }
  }

  static clearAuthToken() {
    try {
      secureStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      secureStorage.removeItem('user_profile');  // Removed auth_timestamp as duplicate with secureStorage
      this.notifyAuthChange(false);
    } catch (error) {
      console.error('Failed to clear token:', error);
    }
  }

  /**
   * Check if token is expired (client-side check)
   */
  static isTokenExpired() {
    const token = this.getAuthToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000; // Convert to milliseconds
      return Date.now() > expiry;
    } catch {
      return true;
    }
  }

  /**
   * Enhanced header building with security considerations
   */
  static buildHeaders(customHeaders = {}, includeAuth = true, isFormData = false) {
    const headers = {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...customHeaders
    };

    // Don't set Content-Type for FormData - browser will set it with boundary
    if (!isFormData) {
      headers['Content-Type'] = 'application/json';
    }

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token && !this.isTokenExpired()) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Enhanced response handler with better error categorization
   */
  static async handleResponse(response, originalUrl) {
    const contentType = response.headers.get('content-type');
    
    try {
      let data;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text')) {
        data = await response.text();
      } else {
        data = await response.blob();
      }

      if (!response.ok) {
        const errorType = response.status >= 500 ? 'server' :
                         response.status === 401 || response.status === 403 ? 'auth' :
                         response.status === 400 || response.status === 422 ? 'validation' :
                         response.status === 404 ? 'not_found' : 
                         'generic';
        
        throw new APIError(
          data?.message || data?.error || 'API request failed',
          response.status,
          data,
          errorType
        );
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) throw error;
      throw new APIError(
        'Failed to process response',
        response.status || 0,
        null,
        'network'
      );
    }
  }

  /**
   * Enhanced request method with retry logic and queuing
   */
  static async request(endpoint, options = {}) {
    const {
      skipQueue = false,
      maxRetries = API_CONFIG.MAX_RETRIES,
      retryCondition = (error) => error.isNetworkError || error.isServerError,
      ...fetchOptions
    } = options;

    const requestFn = () => this._makeRequest(endpoint, fetchOptions, maxRetries, retryCondition);

    if (skipQueue) {
      return requestFn();
    }

    return this.requestQueue.add(requestFn);
  }

  /**
   * Internal request method with retry logic
   */
  static async _makeRequest(endpoint, options, maxRetries, retryCondition) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const isFormData = options.body instanceof FormData;
    
    const defaultOptions = {
      method: 'GET',
      headers: this.buildHeaders(options.headers, options.includeAuth !== false, isFormData),
      credentials: 'include',
      ...options
    };

    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      try {
        // Apply request interceptors
        let finalOptions = defaultOptions;
        for (const interceptor of this.requestInterceptors) {
          finalOptions = await interceptor(finalOptions);
        }

        const response = await fetch(url, {
          ...finalOptions,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Apply response interceptors
        let finalResponse = response;
        for (const interceptor of this.responseInterceptors) {
          finalResponse = await interceptor(finalResponse);
        }

        return await this.handleResponse(finalResponse, url);
      } catch (error) {
        clearTimeout(timeoutId);
        
        if (error.name === 'AbortError') {
          lastError = new APIError('Request timeout', 408, null, 'timeout');
        } else if (error instanceof APIError) {
          lastError = error;
        } else {
          lastError = new APIError(
            'Network error. Please check your connection.',
            0,
            null,
            'network'
          );
        }

        // Check if we should retry
        const shouldRetry = attempt < maxRetries && retryCondition(lastError);
        
        if (!shouldRetry) {
          break;
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          const delay = API_CONFIG.RETRY_DELAYS[attempt] || API_CONFIG.RETRY_DELAYS[API_CONFIG.RETRY_DELAYS.length - 1];
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Enhanced file upload with progress and validation
   */
  static async uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
    // Validate file
    if (!file) {
      throw new APIError('No file provided', 400, null, 'validation');
    }

    if (file.size > API_CONFIG.MAX_FILE_SIZE) {
      throw new APIError(
        `File size exceeds limit (${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        400,
        null,
        'validation'
      );
    }

    if (!API_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new APIError(
        `File type not allowed. Allowed: ${API_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`,
        400,
        null,
        'validation'
      );
    }

    const formData = new FormData();
    formData.append('file', file);

    // Add additional data
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    // Use XMLHttpRequest for progress tracking
    if (onProgress && typeof onProgress === 'function') {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        const url = `${API_CONFIG.BASE_URL}${endpoint}`;
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });

        xhr.addEventListener('load', async () => {
          try {
            const mockResponse = {
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              headers: {
                get: (name) => xhr.getResponseHeader(name)
              },
              json: () => Promise.resolve(JSON.parse(xhr.responseText)),
              text: () => Promise.resolve(xhr.responseText)
            };
            
            const result = await this.handleResponse(mockResponse, url);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });

        xhr.addEventListener('error', () => {
          reject(new APIError('Upload failed', 0, null, 'network'));
        });

        xhr.addEventListener('timeout', () => {
          reject(new APIError('Upload timeout', 408, null, 'timeout'));
        });

        xhr.open('POST', url);
        
        // Set headers
        const token = this.getAuthToken();
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
        
        xhr.timeout = API_CONFIG.TIMEOUT;
        xhr.send(formData);
      });
    } else {
      // Use regular fetch for simple uploads
      return this.request(endpoint, {
        method: 'POST',
        body: formData,
        skipQueue: true // File uploads skip queue due to size
      });
    }
  }

  // ============ AUTHENTICATION ENDPOINTS ============
  
  static async register(userData) {
    const response = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false
    });
    
    return response;
  }

  static async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      includeAuth: false
    });

    if (response.access_token) {
      this.setAuthToken(response.access_token);
      this.notifyAuthChange(true, response.user);
    }

    return response;
  }

  static async logout() {
    try {
      await this.request('/auth/logout', {
        method: 'POST'
      });
    } catch (error) {
      // Continue with local logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      this.clearAuthToken();
    }
  }

  static async refreshToken() {
    try {
      const response = await this.request('/auth/refresh', {
        method: 'POST'
      });

      if (response.access_token) {
        this.setAuthToken(response.access_token);
        return response;
      }
    } catch (error) {
      this.clearAuthToken();
      throw error;
    }
  }

  // ============ PROFILE ENDPOINTS ============

  static async getProfile() {
    return this.request('/profile/me');
  }

  static async updateProfile(profileData) {
    return this.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // ============ DOCUMENT ENDPOINTS ============

  static async uploadDocument(file, documentType, onProgress = null) {
    return this.uploadFile('/documents/upload', file, { 
      document_type: documentType 
    }, onProgress);
  }

  static async getDocuments() {
    return this.request('/documents/me');
  }

  static async downloadDocument(documentId, filename = null) {
    const response = await fetch(`${API_CONFIG.BASE_URL}/documents/download/${documentId}`, {
      headers: this.buildHeaders()
    });

    if (!response.ok) {
      throw new APIError('Download failed', response.status);
    }

    const blob = await response.blob();
    
    if (filename) {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    }

    return blob;
  }

  // ============ JOB ENDPOINTS ============

  static async getJobs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';
    return this.request(endpoint);
  }

  static async getJob(jobId) {
    return this.request(`/jobs/${jobId}`);
  }

  static async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }

  static async updateJob(jobId, jobData) {
    return this.request(`/jobs/${jobId}`, {
      method: 'PUT',
      body: JSON.stringify(jobData)
    });
  }

  static async deleteJob(jobId) {
    return this.request(`/jobs/${jobId}`, {
      method: 'DELETE'
    });
  }

  static async applyForJob(jobId) {
    return this.request(`/jobs/${jobId}/apply`, {
      method: 'POST'
    });
  }

  static async getMyApplications() {
    return this.request('/jobs/applications');
  }

  static async getAllApplications() {
    return this.request('/jobs/admin/applications');
  }

  // ============ ADMIN ENDPOINTS ============

  static async getClients(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/admin/clients?${queryString}` : '/admin/clients';
    return this.request(endpoint);
  }

  static async getClientProfile(clientId) {
    return this.request(`/admin/clients/${clientId}`);
  }

  static async updateClientProfile(clientId, profileData) {
    return this.request(`/admin/clients/${clientId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  static async verifyClient(clientId, verificationNotes = null) {
    const body = verificationNotes ? 
      JSON.stringify({ verification_notes: verificationNotes }) : 
      '{}';
    
    return this.request(`/admin/clients/${clientId}/verify`, {
      method: 'PUT',
      body
    });
  }

  static async getClientDocuments(clientId) {
    return this.request(`/admin/clients/${clientId}/documents`);
  }

  static async uploadProfilePhoto(clientId, formData) {
    return this.request(`/admin/clients/${clientId}/photo`, {
      method: 'POST',
      body: formData,
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }

  // ============ CHAT ENDPOINTS ============
  static async sendChatMessage(receiverId, content) {
    return this.request('/chat/send', {
      method: 'POST',
      body: JSON.stringify({ receiver_id: receiverId, content })
    });
  }

  static async getChatHistory(withUserId) {
    return this.request(`/chat/history?with_user_id=${withUserId}`);
  }

  static async getAdminInbox() {
    return this.request('/chat/admin/inbox');
  }

  // ============ UTILITY METHODS ============

  static addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  static addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  static clearInterceptors() {
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }
}

// Export both the class and error for convenience
export { APIError };
export default APIService;