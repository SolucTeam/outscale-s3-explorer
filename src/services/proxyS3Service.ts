/**
 * Service S3 via proxy CORS
 * Contourne les limitations CORS en utilisant un serveur proxy
 */

import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { cacheService, CacheService } from './cacheService';

export interface ProxyS3Response<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ProxyS3Service {
  private baseUrl = 'http://localhost:3001/api';
  private credentials: S3Credentials | null = null;

  async initialize(credentials: S3Credentials): Promise<ProxyS3Response<boolean>> {
    try {
      console.log('🔌 Initialisation via proxy CORS:', {
        region: credentials.region,
        accessKey: credentials.accessKey.substring(0, 8) + '...'
      });

      this.credentials = credentials;

      // Test de connexion via proxy
      const response = await this.makeRequest<S3Bucket[]>('/buckets');
      
      if (response.success) {
        console.log('✅ Connexion proxy réussie');
        return { success: true, data: true };
      } else {
        return {
          success: false,
          error: response.error || 'Erreur de connexion',
          message: response.message || 'Vérifiez vos identifiants'
        };
      }
    } catch (error) {
      console.error('❌ Erreur initialisation proxy:', error);
      return {
        success: false,
        error: 'Impossible de se connecter au proxy',
        message: 'Vérifiez que le serveur proxy est démarré sur le port 3001'
      };
    }
  }

  private async makeRequest<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ProxyS3Response<T>> {
    if (!this.credentials) {
      throw new Error('Service non initialisé');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'x-access-key': this.credentials.accessKey,
      'x-secret-key': this.credentials.secretKey,
      'x-region': this.credentials.region,
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`❌ Erreur requête ${endpoint}:`, error);
      throw error;
    }
  }

  async getBuckets(): Promise<ProxyS3Response<S3Bucket[]>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    // Vérifier le cache
    const cacheKey = `buckets_${this.credentials.region}`;
    const cached = cacheService.get<S3Bucket[]>(cacheKey);
    if (cached) {
      console.log('📦 Buckets depuis le cache');
      return { success: true, data: cached };
    }

    try {
      console.log('🌐 Chargement buckets via proxy...');
      const response = await this.makeRequest<S3Bucket[]>('/buckets');
      
      if (response.success && response.data) {
        // Mettre en cache
        cacheService.set(cacheKey, response.data, CacheService.TTL.BUCKETS);
        console.log(`✅ ${response.data.length} buckets chargés`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des buckets',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async createBucket(name: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🆕 Création bucket: ${name}`);
      const response = await this.makeRequest<void>('/buckets', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      
      if (response.success) {
        // Invalider le cache
        const cacheKey = `buckets_${this.credentials.region}`;
        cacheService.delete(cacheKey);
        console.log(`✅ Bucket "${name}" créé`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la création du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteBucket(name: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🗑️ Suppression bucket: ${name}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(name)}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Invalider les caches
        const bucketCacheKey = `buckets_${this.credentials.region}`;
        const objectsCacheKey = `objects_${name}`;
        cacheService.delete(bucketCacheKey);
        cacheService.clearByPattern(objectsCacheKey);
        console.log(`✅ Bucket "${name}" supprimé`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la suppression du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getObjects(bucket: string, path: string = ''): Promise<ProxyS3Response<S3Object[]>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    // Vérifier le cache
    const cacheKey = `objects_${bucket}_${path}`;
    const cached = cacheService.get<S3Object[]>(cacheKey);
    if (cached) {
      console.log(`📂 Objets depuis le cache: ${bucket}/${path}`);
      return { success: true, data: cached };
    }

    try {
      console.log(`🌐 Chargement objets: ${bucket}/${path}`);
      const params = new URLSearchParams();
      if (path) params.append('prefix', path);
      params.append('delimiter', '/');
      
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects?${params.toString()}`;
      const response = await this.makeRequest<S3Object[]>(endpoint);
      
      if (response.success && response.data) {
        // Mettre en cache
        cacheService.set(cacheKey, response.data, CacheService.TTL.OBJECTS);
        console.log(`✅ ${response.data.length} objets chargés`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des objets',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getDownloadUrl(bucket: string, objectKey: string): Promise<ProxyS3Response<{ url: string }>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/download`;
      const response = await this.makeRequest<{ url: string }>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la génération du lien',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  isInitialized(): boolean {
    return !!this.credentials;
  }
}

export const proxyS3Service = new ProxyS3Service();