import { apiService } from './api';
import { Event, EventFormData, ApiResponse } from '../types';

export const eventService = {
  async createEvent(eventData: EventFormData): Promise<ApiResponse<Event>> {
    return await apiService.post('/events', eventData);
  },

  async getMyEvents(): Promise<ApiResponse<Event[]>> {
    return await apiService.get('/events');
  },

  async getEventById(eventId: string): Promise<ApiResponse<Event>> {
    return await apiService.get(`/events/${eventId}`);
  },

  async getPublicEvent(eventId: string, password?: string): Promise<ApiResponse<Event>> {
    const params = password ? { password } : undefined;
    return await apiService.get(`/events/public/${eventId}`, params);
  },

  async updateEvent(eventId: string, eventData: Partial<EventFormData>): Promise<ApiResponse<Event>> {
    return await apiService.put(`/events/${eventId}`, eventData);
  },

  async deleteEvent(eventId: string): Promise<ApiResponse<any>> {
    return await apiService.delete(`/events/${eventId}`);
  },

  async uploadCoverImage(eventId: string, file: File): Promise<ApiResponse<Event>> {
    const formData = new FormData();
    formData.append('coverImage', file);
    return await apiService.uploadFile(`/events/${eventId}/cover-image`, formData);
  },

  async generateQRCode(eventId: string): Promise<ApiResponse<{ qrCode: string }>> {
    return await apiService.post(`/events/${eventId}/qr-code`);
  },

  async updateEventSettings(eventId: string, settings: Partial<Event['settings']>): Promise<ApiResponse<Event>> {
    return await apiService.put(`/events/${eventId}/settings`, settings);
  },

  async addPhotographer(eventId: string, photographerEmail: string): Promise<ApiResponse<Event>> {
    return await apiService.post(`/events/${eventId}/photographers`, { email: photographerEmail });
  },

  async removePhotographer(eventId: string, photographerId: string): Promise<ApiResponse<Event>> {
    return await apiService.delete(`/events/${eventId}/photographers/${photographerId}`);
  },

  async getEventStats(eventId: string): Promise<ApiResponse<Event['stats']>> {
    return await apiService.get(`/events/${eventId}/stats`);
  },

  async createAlbum(eventId: string, albumData: { name: string; description?: string }): Promise<ApiResponse<any>> {
    return await apiService.post(`/events/${eventId}/albums`, albumData);
  },

  async updateAlbum(eventId: string, albumId: string, albumData: { name: string; description?: string }): Promise<ApiResponse<any>> {
    return await apiService.put(`/events/${eventId}/albums/${albumId}`, albumData);
  },

  async deleteAlbum(eventId: string, albumId: string): Promise<ApiResponse<any>> {
    return await apiService.delete(`/events/${eventId}/albums/${albumId}`);
  },
};