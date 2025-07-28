import { apiService } from './api';
import { Media, MediaUploadData, ApiResponse } from '../types';

export const mediaService = {
  async uploadMedia(eventId: string, uploadData: MediaUploadData): Promise<ApiResponse<Media[]>> {
    const formData = new FormData();
    
    uploadData.files.forEach((file) => {
      formData.append('media', file);
    });
    
    formData.append('albumId', uploadData.albumId);
    
    if (uploadData.guestName) {
      formData.append('guestName', uploadData.guestName);
    }
    
    if (uploadData.caption) {
      formData.append('caption', uploadData.caption);
    }

    return await apiService.uploadFile(`/media/upload/${eventId}`, formData);
  },

  async getEventMedia(eventId: string, params?: {
    albumId?: string;
    page?: number;
    limit?: number;
    approved?: boolean;
  }): Promise<ApiResponse<{ media: Media[]; totalPages: number; currentPage: number }>> {
    return await apiService.get(`/media/event/${eventId}`, params);
  },

  async getMediaById(mediaId: string): Promise<ApiResponse<Media>> {
    return await apiService.get(`/media/${mediaId}`);
  },

  async updateMedia(mediaId: string, updates: {
    caption?: string;
    albumId?: string;
  }): Promise<ApiResponse<Media>> {
    return await apiService.put(`/media/${mediaId}`, updates);
  },

  async deleteMedia(mediaId: string): Promise<ApiResponse<any>> {
    return await apiService.delete(`/media/${mediaId}`);
  },

  async likeMedia(mediaId: string): Promise<ApiResponse<{ likes: number }>> {
    return await apiService.post(`/media/${mediaId}/like`);
  },

  async unlikeMedia(mediaId: string): Promise<ApiResponse<{ likes: number }>> {
    return await apiService.delete(`/media/${mediaId}/like`);
  },

  async addComment(mediaId: string, comment: {
    content: string;
    authorName: string;
  }): Promise<ApiResponse<Media>> {
    return await apiService.post(`/media/${mediaId}/comments`, comment);
  },

  async deleteComment(mediaId: string, commentId: string): Promise<ApiResponse<Media>> {
    return await apiService.delete(`/media/${mediaId}/comments/${commentId}`);
  },

  async approveMedia(mediaId: string): Promise<ApiResponse<Media>> {
    return await apiService.put(`/media/${mediaId}/approve`);
  },

  async rejectMedia(mediaId: string): Promise<ApiResponse<any>> {
    return await apiService.put(`/media/${mediaId}/reject`);
  },

  async bulkApproveMedia(mediaIds: string[]): Promise<ApiResponse<any>> {
    return await apiService.post('/media/bulk-approve', { mediaIds });
  },

  async bulkDeleteMedia(mediaIds: string[]): Promise<ApiResponse<any>> {
    return await apiService.post('/media/bulk-delete', { mediaIds });
  },

  async downloadMedia(eventId: string, options?: {
    albumId?: string;
    format?: 'zip' | 'individual';
  }): Promise<Blob> {
    const response = await apiService.getAxiosInstance().get(
      `/media/download/${eventId}`,
      {
        params: options,
        responseType: 'blob',
      }
    );
    return response.data;
  },

  async generateSlideshowData(eventId: string, albumId?: string): Promise<ApiResponse<Media[]>> {
    const params = albumId ? { albumId } : undefined;
    return await apiService.get(`/media/slideshow/${eventId}`, params);
  },
};