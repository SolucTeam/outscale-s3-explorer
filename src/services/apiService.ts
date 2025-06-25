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

import { CacheService } from './cacheService';
import { RetryService } from './retryService';
import { ErrorService } from './errorService';

class ApiService {
  private baseUrl: string;
  private token: string | null = null;
  private currentUserId: string | null = null;

  constructor() {
    // Configuration de l'URL de base de votre API Flask
    this.baseUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    this.token = localStorage.getItem('api_token');
    this.currentUserId = localStorage.getItem('user_id');
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {},
    useCache: boolean = false,
    cacheKey?: string,
    cacheType?: keyof typeof CacheService['ttlConfig']
  ): Promise<ApiResponse<T>> {
    // Vérifier le cache d'abord pour les requêtes GET
    if (useCache && cacheKey && options.method !== 'POST' && options.method !== 'PUT' && options.method !== 'DELETE') {
      const cachedData = CacheService.get<T>(cacheKey);
      if (cachedData) {
        return { success: true, data: cachedData };
      }
    }

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
        // Invalidate relevant cache on error
        if (cacheKey) {
          CacheService.delete(cacheKey);
        }
        
        const error = ErrorService.parseError({
          response: { status: response.status, data }
        });
        
        return {
          success: false,
          error: error.message,
          message: error.userMessage
        };
      }

      const result = {
        success: true,
        data: data.data || data
      };

      // Cache successful responses
      if (useCache && cacheKey && cacheType) {
        CacheService.set(cacheKey, result.data, cacheType);
      }

      return result;
    } catch (error) {
      console.error('API Request failed:', error);
      const appError = ErrorService.parseError(error);
      return {
        success: false,
        error: appError.message,
        message: appError.userMessage
      };
    }
  }

  // Authentification
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const config = RetryService.getRetryConfig('auth');
    
    try {
      const response = await RetryService.executeWithRetry(
        () => this.request<LoginResponse>('/auth/login', {
          method: 'POST',
          body: JSON.stringify(credentials)
        }),
        config
      );

      if (response.success && response.data?.token) {
        this.token = response.data.token;
        this.currentUserId = response.data.user.accessKey;
        localStorage.setItem('api_token', this.token);
        localStorage.setItem('user_id', this.currentUserId);
        
        // Cache user info
        const userCacheKey = CacheService.getUserCacheKey(this.currentUserId);
        CacheService.set(userCacheKey, response.data.user, 'user');
      }

      return response;
    } catch (error) {
      return ErrorService.parseError(error) as any;
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await this.request<void>('/auth/logout', {
        method: 'POST'
      });

      if (response.success) {
        // Clear cache and local storage
        if (this.currentUserId) {
          CacheService.invalidateUser(this.currentUserId);
        }
        CacheService.clear();
        
        this.token = null;
        this.currentUserId = null;
        localStorage.removeItem('api_token');
        localStorage.removeItem('user_id');
      }

      return response;
    } catch (error) {
      return ErrorService.parseError(error) as any;
    }
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    const response = await this.request<{ token: string }>('/auth/refresh', {
      method: 'POST'
    });

    if (response.success && response.data?.token) {
      this.token = response.data.token;
      localStorage.setItem('api_token', this.token);
    }

    return response;
  }

  // Gestion des régions
  async getRegions(): Promise<ApiResponse<Array<{ id: string; name: string; endpoint: string }>>> {
    const cacheKey = CacheService.getRegionsCacheKey();
    const config = RetryService.getRetryConfig('bucket');
    
    try {
      return await RetryService.executeWithRetry(
        () => this.request('/regions', {}, true, cacheKey, 'regions'),
        config
      );
    } catch (error) {
      return ErrorService.parseError(error) as any;
    }
  }

  async selectRegion(regionId: string): Promise<ApiResponse<void>> {
    return this.request('/regions/select', {
      method: 'POST',
      body: JSON.stringify({ region: regionId })
    });
  }

  // Gestion des buckets
  async getBuckets(): Promise<ApiResponse<BucketData[]>> {
    if (!this.currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    const cacheKey = CacheService.getBucketsCacheKey('current', this.currentUserId);
    const config = RetryService.getRetryConfig('bucket');
    
    try {
      return await RetryService.executeWithRetry(
        () => this.request('/buckets', {}, true, cacheKey, 'buckets'),
        config
      );
    } catch (error) {
      return ErrorService.parseError(error) as any;
    }
  }

  async createBucket(name: string, region: string): Promise<ApiResponse<void>> {
    const config = RetryService.getRetryConfig('bucket');
    
    try {
      const response = await RetryService.executeWithRetry(
        async () => {
          const result = await this.request<void>('/buckets', {
            method: 'POST',
            body: JSON.stringify({ name, region })
          });
          return result;
        },
        config
      );

      // Invalidate buckets cache on successful creation
      if (response.success && this.currentUserId) {
        CacheService.invalidatePattern(`buckets:${this.currentUserId}`);
      }

      return response;
    } catch (error) {
      const appError = ErrorService.parseError(error);
      return {
        success: false,
        error: appError.message,
        message: appError.userMessage
      };
    }
  }

  async deleteBucket(name: string): Promise<ApiResponse<void>> {
    const config = RetryService.getRetryConfig('bucket');
    
    try {
      const response = await RetryService.executeWithRetry(
        async () => {
          const result = await this.request<void>(`/buckets/${encodeURIComponent(name)}`, {
            method: 'DELETE'
          });
          return result;
        },
        config
      );

      // Invalidate related cache on successful deletion
      if (response.success && this.currentUserId) {
        CacheService.invalidateBucket(name, this.currentUserId);
      }

      return response;
    } catch (error) {
      const appError = ErrorService.parseError(error);
      return {
        success: false,
        error: appError.message,
        message: appError.userMessage
      };
    }
  }

  // Gestion des objets
  async getObjects(bucket: string, path: string = ''): Promise<ApiResponse<ObjectData[]>> {
    if (!this.currentUserId) {
      return { success: false, error: 'User not authenticated' };
    }

    const cacheKey = CacheService.getObjectsCacheKey(bucket, path, this.currentUserId);
    const config = RetryService.getRetryConfig('object');
    
    try {
      const params = new URLSearchParams();
      if (path) params.append('path', path);
      
      return await RetryService.executeWithRetry(
        () => this.request(`/buckets/${encodeURIComponent(bucket)}/objects?${params}`, {}, true, cacheKey, 'objects'),
        config
      );
    } catch (error) {
      return ErrorService.parseError(error) as any;
    }
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
      const response = await fetch(`${this.baseUrl}/buckets/${encodeURIComponent(bucket)}/upload`, {
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
        error: 'Erreur lors de l\'upload'
      };
    }
  }

  async deleteObject(bucket: string, objectKey: string): Promise<ApiResponse<void>> {
    return this.request(`/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}`, {
      method: 'DELETE'
    });
  }

  async downloadObject(bucket: string, objectKey: string): Promise<ApiResponse<{ url: string }>> {
    return this.request(`/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}`);
  }

  async createFolder(bucket: string, path: string, folderName: string): Promise<ApiResponse<void>> {
    return this.request(`/buckets/${encodeURIComponent(bucket)}/folders`, {
      method: 'POST',
      body: JSON.stringify({ path, folderName })
    });
  }

  // Vérification du token
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  // Méthode pour obtenir les stats de cache
  getCacheStats() {
    return CacheService.getStats();
  }

  // Méthode pour vider le cache manuellement
  clearCache() {
    CacheService.clear();
  }
}

export const apiService = new ApiService();
export type { ApiResponse, LoginRequest, LoginResponse, BucketData, ObjectData };
