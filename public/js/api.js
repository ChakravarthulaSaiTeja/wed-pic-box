/**
 * API utility class for making HTTP requests
 * Handles authentication, error handling, and request/response formatting
 */

class API {
    static baseURL = '/api';

    static async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        // Default headers
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }

        // Add event password if available
        if (window.app?.eventPassword) {
            headers['X-Event-Password'] = window.app.eventPassword;
        }

        const config = {
            method: 'GET',
            headers,
            ...options
        };

        // Handle FormData (for file uploads)
        if (config.body instanceof FormData) {
            delete headers['Content-Type']; // Let browser set it for FormData
        } else if (config.body && typeof config.body === 'object') {
            config.body = JSON.stringify(config.body);
        }

        try {
            const response = await fetch(url, config);
            
            // Handle different content types
            let data;
            const contentType = response.headers.get('content-type');
            
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else if (contentType && contentType.includes('text/')) {
                data = await response.text();
            } else {
                data = await response.blob();
            }

            if (!response.ok) {
                const error = new Error(data.message || `HTTP ${response.status}`);
                error.status = response.status;
                error.data = data;
                throw error;
            }

            return data;
        } catch (error) {
            console.error(`API Error: ${config.method} ${url}`, error);
            throw error;
        }
    }

    static async get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    }

    static async post(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'POST', body });
    }

    static async put(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PUT', body });
    }

    static async patch(endpoint, body, options = {}) {
        return this.request(endpoint, { ...options, method: 'PATCH', body });
    }

    static async delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    }

    // File upload helper
    static async uploadFiles(endpoint, files, additionalData = {}) {
        const formData = new FormData();
        
        // Add files
        if (Array.isArray(files)) {
            files.forEach(file => formData.append('media', file));
        } else {
            formData.append('media', files);
        }

        // Add additional data
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        return this.post(endpoint, formData);
    }

    // Download helper
    static async download(endpoint, filename) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    Authorization: localStorage.getItem('authToken') ? 
                        `Bearer ${localStorage.getItem('authToken')}` : ''
                }
            });

            if (!response.ok) {
                throw new Error(`Download failed: ${response.status}`);
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'download';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.API = API;