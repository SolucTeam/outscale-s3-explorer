
import { RetryService } from './retryService';
import { CacheService } from './cacheService';
import { apiService, ApiResponse } from './apiService';

interface RequestOptions {
  useCache?: boolean;
  cacheType?: 'buckets' | 'objects' | 'regions' | 'user' | 'metadata';
  retryConfig?: 'auth' | 'bucket' | 'object' | 'upload';
}

class EnhancedApiService {
  private requestQueue = new Map<string, Promise<any>>();

  async enhancedRequest<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    cacheKey?: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const {
      useCache = true,
      cacheType = 'metadata',
      retryConfig = 'bucket'
    } = options;

    // Check cache first
    if (useCache && cacheKey) {
      const cached = CacheService.get<T>(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    }

    // Prevent duplicate requests
    if (cacheKey && this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this.executeWithRetryAndCache<T>(
      requestFn,
      cacheKey,
      cacheType,
      retryConfig
    );

    if (cacheKey) {
      this.requestQueue.set(cacheKey, requestPromise);
    }

    try {
      const result = await requestPromise;
      return result;
    } finally {
      if (cacheKey) {
        this.requestQueue.delete(cacheKey);
      }
    }
  }

  private async executeWithRetryAndCache<T>(
    requestFn: () => Promise<ApiResponse<T>>,
    cacheKey?: string,
    cacheType: RequestOptions['cacheType'] = 'metadata',
    retryType: RequestOptions['retryConfig'] = 'bucket'
  ): Promise<ApiResponse<T>> {
    try {
      const result = await RetryService.executeWithRetry(
        requestFn,
        RetryService.getRetryConfig(retryType)
      );

      // Cache successful results
      if (result.success && result.data && cacheKey) {
        CacheService.set(cacheKey, result.data, cacheType);
      }

      return result;
    } catch (error) {
      console.error('Enhanced API request failed:', error);
      return {
        success: false,
        error: 'Request failed after retries',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Enhanced API methods with caching and retry
  async getBuckets(userId: string, region: string) {
    const cacheKey = CacheService.getBucketsCacheKey(region, userId);
    return this.enhancedRequest(
      () => apiService.getBuckets(),
      cacheKey,
      { cacheType: 'buckets', retryConfig: 'bucket' }
    );
  }

  async getObjects(bucket: string, path: string, userId: string) {
    const cacheKey = CacheService.getObjectsCacheKey(bucket, path, userId);
    return this.enhancedRequest(
      () => apiService.getObjects(bucket, path),
      cacheKey,
      { cacheType: 'objects', retryConfig: 'object' }
    );
  }

  async createBucket(name: string, region?: string, userId?: string) {
    const result = await this.enhancedRequest(
      () => apiService.createBucket(name, region),
      undefined,
      { useCache: false, retryConfig: 'bucket' }
    );

    // Invalidate buckets cache after creation
    if (result.success && userId) {
      CacheService.invalidateBucket(name, userId);
    }

    return result;
  }

  async deleteBucket(name: string, userId?: string) {
    const result = await this.enhancedRequest(
      () => apiService.deleteBucket(name),
      undefined,
      { useCache: false, retryConfig: 'bucket' }
    );

    // Invalidate cache after deletion
    if (result.success && userId) {
      CacheService.invalidateBucket(name, userId);
    }

    return result;
  }

  async uploadFile(file: File, bucket: string, path: string, userId?: string) {
    const result = await this.enhancedRequest(
      () => apiService.uploadFile(file, bucket, path),
      undefined,
      { useCache: false, retryConfig: 'upload' }
    );

    // Invalidate objects cache after upload
    if (result.success && userId) {
      CacheService.invalidateObjects(bucket, userId);
    }

    return result;
  }

  async deleteObject(bucket: string, objectKey: string, userId?: string) {
    const result = await this.enhancedRequest(
      () => apiService.deleteObject(bucket, objectKey),
      undefined,
      { useCache: false, retryConfig: 'object' }
    );

    // Invalidate cache after deletion
    if (result.success && userId) {
      CacheService.invalidateObjects(bucket, userId);
    }

    return result;
  }

  // Delegate other methods to original service
  async login(credentials: any) {
    return this.enhancedRequest(
      () => apiService.login(credentials),
      undefined,
      { useCache: false, retryConfig: 'auth' }
    );
  }

  async logout() {
    return apiService.logout();
  }

  async getDownloadUrl(bucket: string, objectKey: string) {
    return this.enhancedRequest(
      () => apiService.getDownloadUrl(bucket, objectKey),
      undefined,
      { useCache: false, retryConfig: 'object' }
    );
  }

  async createFolder(bucket: string, path: string, folderName: string, userId?: string) {
    const result = await this.enhancedRequest(
      () => apiService.createFolder(bucket, path, folderName),
      undefined,
      { useCache: false, retryConfig: 'object' }
    );

    // Invalidate cache after folder creation
    if (result.success && userId) {
      CacheService.invalidateObjects(bucket, userId);
    }

    return result;
  }

  // Cache management methods
  clearCache() {
    CacheService.clear();
  }

  getCacheStats() {
    return CacheService.getStats();
  }
}

export const enhancedApiService = new EnhancedApiService();
