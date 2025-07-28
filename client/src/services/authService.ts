import { apiService } from './api';
import { User, LoginCredentials, RegisterData, ApiResponse } from '../types';

export const authService = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await apiService.post<{ user: User; token: string }>('/auth/login', credentials);
    
    if (response.success && response.data) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  async register(userData: RegisterData): Promise<ApiResponse<{ user: User; token: string }>> {
    const response = await apiService.post<{ user: User; token: string }>('/auth/register', userData);
    
    if (response.success && response.data) {
      localStorage.setItem('authToken', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  },

  async logout(): Promise<void> {
    try {
      await apiService.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    }
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return await apiService.get<User>('/auth/profile');
  },

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return await apiService.put<User>('/auth/profile', userData);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<any>> {
    return await apiService.put<any>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
  },

  async uploadProfilePicture(file: File): Promise<ApiResponse<User>> {
    const formData = new FormData();
    formData.append('profilePicture', file);
    return await apiService.uploadFile<User>('/auth/profile-picture', formData);
  },

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return await apiService.post<{ token: string }>('/auth/refresh');
  },

  // Get stored user data
  getStoredUser(): User | null {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  },

  // Get stored token
  getStoredToken(): string | null {
    return localStorage.getItem('authToken');
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!this.getStoredToken();
  },
};