
import { apiService, ApiResponse } from './apiService';
import { requestQueue } from './requestQueue';

class RateLimitedApiService {
  // Authentication methods with rate limiting
  async login(credentials: any): Promise<ApiResponse<any>> {
    return requestQueue.enqueue(
      () => apiService.login(credentials),
      { priority: 10, maxRetries: 2 } // High priority, fewer retries for auth
    );
  }

  async logout(): Promise<ApiResponse<void>> {
    return requestQueue.enqueue(
      () => apiService.logout(),
      { priority: 8 }
    );
  }

  async refreshToken(): Promise<ApiResponse<{ token: string }>> {
    return requestQueue.enqueue(
      () => apiService.refreshToken(),
      { priority: 9, maxRetries: 2 }
    );
  }

  // Bucket operations with rate limiting
  async getBuckets(): Promise<ApiResponse<any[]>> {
    return requestQueue.enqueue(
      () => apiService.getBuckets(),
      { priority: 7 }
    );
  }

  async createBucket(name: string, region?: string): Promise<ApiResponse<void>> {
    return requestQueue.enqueue(
      () => apiService.createBucket(name, region),
      { priority: 6 }
    );
  }

  async deleteBucket(name: string): Promise<ApiResponse<void>> {
    return requestQueue.enqueue(
      () => apiService.deleteBucket(name),
      { priority: 6 }
    );
  }

  // Object operations with rate limiting
  async getObjects(bucket: string, path?: string): Promise<ApiResponse<any[]>> {
    return requestQueue.enqueue(
      () => apiService.getObjects(bucket, path),
      { priority: 5 }
    );
  }

  async uploadFile(file: File, bucket: string, path?: string): Promise<ApiResponse<void>> {
    return requestQueue.enqueue(
      () => apiService.uploadFile(file, bucket, path),
      { priority: 4, maxRetries: 5 } // More retries for uploads
    );
  }

  async deleteObject(bucket: string, objectKey: string): Promise<ApiResponse<void>> {
    return requestQueue.enqueue(
      () => apiService.deleteObject(bucket, objectKey),
      { priority: 5 }
    );
  }

  async getDownloadUrl(bucket: string, objectKey: string): Promise<ApiResponse<{ url: string }>> {
    return requestQueue.enqueue(
      () => apiService.getDownloadUrl(bucket, objectKey),
      { priority: 7 }
    );
  }

  async createFolder(bucket: string, path: string, folderName: string): Promise<ApiResponse<void>> {
    return requestQueue.enqueue(
      () => apiService.createFolder(bucket, path, folderName),
      { priority: 5 }
    );
  }

  // Utility methods
  isAuthenticated(): boolean {
    return apiService.isAuthenticated();
  }

  getToken(): string | null {
    return apiService.getToken();
  }

  getQueueStatus() {
    return {
      queueLength: requestQueue.getQueueLength()
    };
  }

  clearQueue(): void {
    requestQueue.clearQueue();
  }
}

export const rateLimitedApiService = new RateLimitedApiService();
