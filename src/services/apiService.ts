
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

interface LoginRequest {
  accessKey: string;
  secretKey: string;
  region: string;
}

interface LoginResponse {
  token: string;
  user: {
    accessKey: string;
    region: string;
  };
}

interface BucketData {
  name: string;
  creationDate: string;
  region: string;
  objectCount?: number;
  size?: number;
}

interface ObjectData {
  key: string;
  lastModified: string;
  size: number;
  etag: string;
  storageClass: string;
  isFolder: boolean;
}

class ApiService {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    this.token = localStorage.getItem('auth_token');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.message || 'Request failed'
        };
      }

      return {
        success: true,
        data: data.data || data
      };
    } catch (error) {
      console.error('API Request failed:', error);
      return {
        success: false,
        error: 'Network error',
        message: 'Failed to connect to server'
      };
    }
  }

  // Authentication
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', this.token);
    }

    return response;
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.request<void>('/auth/logout', {
      method: 'POST'
    });

    this.token = null;
    localStorage.removeItem('auth_token');
    return response;
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await this.request<{ token: string }>('/auth/refresh', {
      method: 'POST'
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('auth_token', this.token);
    }

    return response;
  }

  // Regions
  async getRegions(): Promise<ApiResponse<Array<{ id: string; name: string; endpoint: string }>>> {
    return this.request('/auth/regions');
  }

  // Buckets
  async getBuckets(): Promise<ApiResponse<BucketData[]>> {
    return this.request('/s3/buckets');
  }

  async createBucket(name: string, region?: string): Promise<ApiResponse<void>> {
    return this.request('/s3/buckets', {
      method: 'POST',
      body: JSON.stringify({ name, region })
    });
  }

  async deleteBucket(name: string): Promise<ApiResponse<void>> {
    return this.request(`/s3/buckets/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
  }

  // Objects
  async getObjects(bucket: string, path: string = ''): Promise<ApiResponse<ObjectData[]>> {
    const params = new URLSearchParams();
    if (path) params.append('path', path);
    
    return this.request(`/s3/buckets/${encodeURIComponent(bucket)}/objects?${params}`);
  }

  async uploadFile(file: File, bucket: string, path: string = ''): Promise<ApiResponse<void>> {
    const formData = new FormData();
    formData.append('file', file);
    if (path) formData.append('path', path);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/s3/buckets/${encodeURIComponent(bucket)}/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}`,
          message: data.message
        };
      }

      return {
        success: true,
        data: data.data || data
      };
    } catch (error) {
      console.error('Upload failed:', error);
      return {
        success: false,
        error: 'Upload failed',
        message: 'Failed to upload file'
      };
    }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<ApiResponse<void>> {
    return this.request(`/s3/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}`, {
      method: 'DELETE'
    });
  }

  async getDownloadUrl(bucket: string, objectKey: string): Promise<ApiResponse<{ url: string }>> {
    return this.request(`/s3/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/download`);
  }

  async createFolder(bucket: string, path: string, folderName: string): Promise<ApiResponse<void>> {
    return this.request(`/s3/buckets/${encodeURIComponent(bucket)}/folders`, {
      method: 'POST',
      body: JSON.stringify({ path, folderName })
    });
  }

  // Utils
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService();
export type { ApiResponse, LoginRequest, LoginResponse, BucketData, ObjectData };
