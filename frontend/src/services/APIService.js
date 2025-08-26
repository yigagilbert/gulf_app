/**
 * Professional API Service for Job Placement System
 * Handles all HTTP requests with proper error handling, authentication, and typing
 */

// Configuration
const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
  TIMEOUT: 30000, // 30 seconds
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: [
    'image/jpeg',
    'image/png', 
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
};

/**
 * Custom API Error class for better error handling
 */
class APIError extends Error {
  constructor(message, status, response = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.response = response;
  }
}

/**
 * Professional API Service Class
 */
class APIService {
  /**
   * Get authentication token from localStorage
   * @returns {string|null} The bearer token or null
   */
  static getAuthToken() {
    try {
      return localStorage.getItem('token');
    } catch (error) {
      console.warn('Failed to retrieve token from localStorage:', error);
      return null;
    }
  }

  /**
   * Set authentication token in localStorage
   * @param {string} token - The JWT token
   */
  static setAuthToken(token) {
    try {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Failed to store token in localStorage:', error);
    }
  }

  /**
   * Clear authentication token
   */
  static clearAuthToken() {
    this.setAuthToken(null);
  }

  /**
   * Build headers for API requests
   * @param {Object} customHeaders - Additional headers
   * @param {boolean} includeAuth - Whether to include auth token
   * @returns {Object} Headers object
   */
  static buildHeaders(customHeaders = {}, includeAuth = true) {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...customHeaders
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Handle API response and errors
   * @param {Response} response - Fetch response object
   * @returns {Promise} Parsed response data
   */
  static async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    
    try {
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        // Handle different error status codes
        let errorMessage = 'An error occurred';
        
        if (data && typeof data === 'object' && data.detail) {
          errorMessage = data.detail;
        } else if (typeof data === 'string') {
          errorMessage = data;
        }

        // Handle specific status codes
        switch (response.status) {
          case 401:
            this.clearAuthToken();
            errorMessage = 'Authentication failed. Please login again.';
            break;
          case 403:
            errorMessage = 'Access denied. Insufficient permissions.';
            break;
          case 404:
            errorMessage = 'Resource not found.';
            break;
          case 422:
            errorMessage = 'Validation error. Please check your input.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please try again later.';
            break;
          case 500:
            errorMessage = 'Server error. Please try again later.';
            break;
        }

        throw new APIError(errorMessage, response.status, data);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      
      // Handle parsing errors
      throw new APIError(
        'Failed to parse server response',
        response.status,
        null
      );
    }
  }

  /**
   * Make HTTP request with timeout and error handling
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Fetch options
   * @returns {Promise} Response data
   */
  static async request(endpoint, options = {}) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: this.buildHeaders(options.headers, options.includeAuth !== false),
      ...options
    };

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...defaultOptions,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return await this.handleResponse(response);
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new APIError('Request timeout', 408);
      }
      
      if (error instanceof APIError) {
        throw error;
      }
      
      // Network or other errors
      throw new APIError(
        'Network error. Please check your connection.',
        0,
        null
      );
    }
  }

  /**
   * Validate file for upload
   * @param {File} file - File to validate
   * @throws {APIError} If file is invalid
   */
  static validateFile(file) {
    if (!file) {
      throw new APIError('No file provided', 400);
    }

    if (file.size > API_CONFIG.MAX_FILE_SIZE) {
      throw new APIError(
        `File size exceeds limit (${API_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`,
        400
      );
    }

    if (!API_CONFIG.ALLOWED_FILE_TYPES.includes(file.type)) {
      throw new APIError(
        `File type not allowed. Allowed types: ${API_CONFIG.ALLOWED_FILE_TYPES.join(', ')}`,
        400
      );
    }
  }

  /**
   * Upload file with progress tracking
   * @param {string} endpoint - Upload endpoint
   * @param {File} file - File to upload
   * @param {Object} additionalData - Additional form data
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Upload response
   */
  static async uploadFile(endpoint, file, additionalData = {}, onProgress = null) {
    this.validateFile(file);

    const formData = new FormData();
    formData.append('file', file);

    // Add additional data to form
    Object.entries(additionalData).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });

    const headers = {};
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    try {
      // Use XMLHttpRequest for progress tracking if callback provided
      if (onProgress && typeof onProgress === 'function') {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          
          xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable) {
              const progress = Math.round((event.loaded / event.total) * 100);
              onProgress(progress);
            }
          });

          xhr.addEventListener('load', async () => {
            try {
              const response = {
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                headers: {
                  get: (name) => xhr.getResponseHeader(name)
                },
                json: () => Promise.resolve(JSON.parse(xhr.responseText)),
                text: () => Promise.resolve(xhr.responseText)
              };
              
              const result = await this.handleResponse(response);
              resolve(result);
            } catch (error) {
              reject(error);
            }
          });

          xhr.addEventListener('error', () => {
            reject(new APIError('Upload failed', 0));
          });

          xhr.addEventListener('timeout', () => {
            reject(new APIError('Upload timeout', 408));
          });

          xhr.open('POST', url);
          Object.entries(headers).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value);
          });
          xhr.timeout = API_CONFIG.TIMEOUT;
          xhr.send(formData);
        });
      } else {
        // Use fetch for simple uploads
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: formData
        });

        return await this.handleResponse(response);
      }
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Upload failed', 0);
    }
  }

  /**
   * Download file as blob
   * @param {string} endpoint - Download endpoint
   * @param {string} filename - Optional filename for download
   * @returns {Promise<Blob>} File blob
   */
  static async downloadFile(endpoint, filename = null) {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const headers = {};
    
    const token = this.getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        throw new APIError(
          `Download failed: ${errorText || 'Unknown error'}`,
          response.status
        );
      }

      const blob = await response.blob();
      
      // Trigger download if filename provided
      if (filename) {
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }

      return blob;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('Download failed', 0);
    }
  }

  // ============ AUTH ENDPOINTS ============
  
  /**
   * User registration
   * @param {Object} userData - {email, password}
   * @returns {Promise} User data
   */
  static async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
      includeAuth: false
    });
  }

  /**
   * User login
   * @param {Object} credentials - {email, password}
   * @returns {Promise} Login response with token
   */
  static async login(credentials) {
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      includeAuth: false
    });

    // Store token automatically
    if (response.access_token) {
      this.setAuthToken(response.access_token);
    }

    return response;
  }

  /**
   * Logout user
   */
  static async logout() {
    this.clearAuthToken();
    // Could add server-side logout endpoint call here if needed
  }

  // ============ PROFILE ENDPOINTS ============

  /**
   * Get current user profile
   * @returns {Promise} Profile data
   */
  static async getProfile() {
    return this.request('/profile/me');
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile fields to update
   * @returns {Promise} Updated profile data
   */
  static async updateProfile(profileData) {
    return this.request('/profile/me', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  /**
   * Get basic profile info (debugging endpoint)
   * @returns {Promise} Basic profile info
   */
  static async getProfileBasic() {
    return this.request('/profile/me/basic');
  }

  // ============ DOCUMENT ENDPOINTS ============

  /**
   * Upload document
   * @param {File} file - Document file
   * @param {string} documentType - Type of document
   * @param {Function} onProgress - Progress callback
   * @returns {Promise} Upload response
   */
  static async uploadDocument(file, documentType, onProgress = null) {
    return this.uploadFile('/documents/upload', file, { document_type: documentType }, onProgress);
  }

  /**
   * Get user's documents
   * @returns {Promise} Array of documents
   */
  static async getDocuments() {
    return this.request('/documents/me');
  }

  /**
   * Download document
   * @param {string} documentId - Document ID
   * @param {string} filename - Optional filename
   * @returns {Promise<Blob>} Document blob
   */
  static async downloadDocument(documentId, filename = null) {
    return this.downloadFile(`/documents/download/${documentId}`, filename);
  }

  // ============ JOB ENDPOINTS ============

  /**
   * Get available jobs
   * @param {Object} params - Query parameters {skip, limit, is_active}
   * @returns {Promise} Array of jobs
   */
  static async getJobs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/jobs?${queryString}` : '/jobs';
    return this.request(endpoint);
  }

  /**
   * Create job opportunity (admin only)
   * @param {Object} jobData - Job data
   * @returns {Promise} Created job
   */
  static async createJob(jobData) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData)
    });
  }

  // ============ ADMIN ENDPOINTS ============

  /**
   * Get all clients (admin only)
   * @param {Object} params - Query parameters {skip, limit, status}
   * @returns {Promise} Array of clients
   */
  static async getClients(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/admin/clients?${queryString}` : '/admin/clients';
    return this.request(endpoint);
  }

  /**
   * Verify client (admin only)
   * @param {string} clientId - Client ID
   * @param {string} verificationNotes - Optional notes
   * @returns {Promise} Updated client
   */
  static async verifyClient(clientId, verificationNotes = null) {
    const body = verificationNotes ? JSON.stringify({ verification_notes: verificationNotes }) : '{}';
    return this.request(`/admin/clients/${clientId}/verify`, {
      method: 'PUT',
      body
    });
  }

  /**
   * Get client documents (admin only)
   * @param {string} clientId - Client ID
   * @returns {Promise} Array of client documents
   */
  static async getClientDocuments(clientId) {
    return this.request(`/admin/clients/${clientId}/documents`);
  }
}

// Export both the class and error for convenience
export { APIError };
export default APIService;