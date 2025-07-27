export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'host' | 'photographer';
  profilePicture?: {
    url: string;
    cloudinaryPublicId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  _id: string;
  title: string;
  description?: string;
  coupleNames: {
    partner1: string;
    partner2: string;
  };
  eventDate: string;
  venue?: {
    name: string;
    address: string;
  };
  host: string | User;
  photographers: string[] | User[];
  albums: Album[];
  settings: {
    allowGuestUpload: boolean;
    requireApproval: boolean;
    maxFileSize: number;
    allowedFileTypes: string[];
    isPublic: boolean;
    password?: string;
  };
  coverImage?: {
    url: string;
    cloudinaryPublicId: string;
  };
  qrCode?: {
    url: string;
    code: string;
  };
  stats: {
    totalPhotos: number;
    totalVideos: number;
    totalLikes: number;
    totalComments: number;
    totalGuests: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Album {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  coverImage?: {
    url: string;
    cloudinaryPublicId: string;
  };
  mediaCount: number;
  createdAt: string;
}

export interface Media {
  _id: string;
  event: string | Event;
  album: string | Album;
  fileName: string;
  originalName: string;
  fileType: 'image' | 'video';
  fileSize: number;
  url: string;
  thumbnailUrl?: string;
  cloudinaryPublicId: string;
  uploadedBy?: {
    guestName?: string;
    userId?: string | User;
  };
  caption?: string;
  likes: number;
  comments: Comment[];
  isApproved: boolean;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    format: string;
  };
  uploadedAt: string;
  createdAt: string;
}

export interface Comment {
  _id: string;
  author: {
    name: string;
    userId?: string;
  };
  content: string;
  createdAt: string;
}

export interface GuestbookEntry {
  _id: string;
  event: string | Event;
  author: {
    name: string;
    email?: string;
  };
  message: string;
  audioMessage?: {
    url: string;
    duration: number;
    cloudinaryPublicId: string;
  };
  isApproved: boolean;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'host' | 'photographer';
}

export interface EventFormData {
  title: string;
  description?: string;
  coupleNames: {
    partner1: string;
    partner2: string;
  };
  eventDate: string;
  venue?: {
    name: string;
    address: string;
  };
}

export interface MediaUploadData {
  files: File[];
  albumId: string;
  guestName?: string;
  caption?: string;
}

export interface GuestbookFormData {
  author: {
    name: string;
    email?: string;
  };
  message: string;
  audioFile?: File;
}