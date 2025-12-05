/**
 * Service S3 via proxy CORS
 * Contourne les limitations CORS en utilisant un serveur proxy
 */

import { S3Credentials, S3Bucket, S3Object, ObjectVersion, ObjectRetention, ObjectLockConfiguration, BucketAcl, BucketPolicy } from '../types/s3';
import { cacheService, CacheService } from './cacheService';
import { env } from '../config/environment';

export interface ProxyS3Response<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ProxyS3Service {
  private baseUrl = env.proxyUrl;
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
      
      // Vérifier si c'est une erreur de connexion au proxy
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        return {
          success: false,
          error: '🚫 Serveur proxy non accessible',
          message: '⚠️ SOLUTION: Exécutez "./start.sh" (Linux/Mac) ou "start.bat" (Windows) pour démarrer les deux serveurs'
        };
      }
      
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
    
    const headers: Record<string, string> = {
      'x-access-key': this.credentials.accessKey,
      'x-secret-key': this.credentials.secretKey,
      'x-region': this.credentials.region,
      ...options.headers as Record<string, string>
    };

    // N'ajouter Content-Type que si ce n'est pas FormData
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

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
      
      // Si c'est une erreur de connexion, afficher un message plus clair
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('🚫 PROXY SERVER NOT RUNNING! Run: npm run dev:all');
      }
      
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

  async createBucket(
    name: string, 
    options?: { 
      objectLockEnabled?: boolean;
      versioningEnabled?: boolean;
      encryptionEnabled?: boolean;
    }
  ): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🆕 Création bucket: ${name}`, options);
      const response = await this.makeRequest<void>('/buckets', {
        method: 'POST',
        body: JSON.stringify({ 
          name,
          objectLockEnabled: options?.objectLockEnabled,
          versioningEnabled: options?.versioningEnabled,
          encryptionEnabled: options?.encryptionEnabled
        })
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

  async deleteBucket(name: string, force: boolean = false): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🗑️ Suppression bucket: ${name}${force ? ' (forcée)' : ''}`);
      const url = `/buckets/${encodeURIComponent(name)}${force ? '?force=true' : ''}`;
      const response = await this.makeRequest<void>(url, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Invalider les caches
        cacheService.delete('buckets');
        cacheService.clearByPattern(`buckets_`);
        cacheService.clearByPattern(`objects_${name}`);
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

    // Normaliser le chemin (toujours un trailing slash pour un listing de dossier correct)
    const normalizedPath = path ? path.replace(/^\/+|\/+$/g, '') + '/' : '';

    // Vérifier le cache
    const cacheKey = `objects_${bucket}_${normalizedPath}`;
    const cached = cacheService.get<S3Object[]>(cacheKey);
    if (cached) {
      console.log(`📂 Objets depuis le cache: ${bucket}/${normalizedPath}`);
      return { success: true, data: cached };
    }

    try {
      console.log(`🌐 Chargement objets: ${bucket}/${normalizedPath}`);
      const params = new URLSearchParams();
      if (normalizedPath) params.append('prefix', normalizedPath);
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

  async getDownloadUrl(bucket: string, objectKey: string, versionId?: string): Promise<ProxyS3Response<{ url: string }>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const params = new URLSearchParams();
      if (versionId) params.append('versionId', versionId);
      
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/download${params.toString() ? '?' + params.toString() : ''}`;
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

  async deleteObject(bucket: string, objectKey: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🗑️ Suppression objet: ${bucket}/${objectKey}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Invalider le cache
        const cacheKey = `objects_${bucket}`;
        cacheService.clearByPattern(cacheKey);
        console.log(`✅ Objet "${objectKey}" supprimé`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la suppression de l\'objet',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async uploadFile(bucket: string, path: string, file: File): Promise<ProxyS3Response<{ key: string }>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`📤 Upload: ${file.name} vers ${bucket}/${path}`);
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);

      const response = await this.makeRequest<{ key: string }>(`/buckets/${encodeURIComponent(bucket)}/objects`, {
        method: 'POST',
        body: formData,
        headers: {
          'x-access-key': this.credentials.accessKey,
          'x-secret-key': this.credentials.secretKey,
          'x-region': this.credentials.region
        }
      });
      
      if (response.success) {
        // Invalider le cache
        const cacheKey = `objects_${bucket}`;
        cacheService.clearByPattern(cacheKey);
        console.log(`✅ Fichier "${file.name}" uploadé`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de l\'upload du fichier',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async createFolder(bucket: string, path: string, folderName: string): Promise<ProxyS3Response<{ key: string }>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`📁 Création dossier: ${folderName} dans ${bucket}/${path}`);
      const response = await this.makeRequest<{ key: string }>(`/buckets/${encodeURIComponent(bucket)}/folders`, {
        method: 'POST',
        body: JSON.stringify({ path, folderName })
      });
      
      if (response.success) {
        // Invalider le cache
        const cacheKey = `objects_${bucket}`;
        cacheService.clearByPattern(cacheKey);
        console.log(`✅ Dossier "${folderName}" créé`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la création du dossier',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setBucketVersioning(bucket: string, enabled: boolean): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`⚙️ Configuration versioning: ${bucket} -> ${enabled}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/versioning`, {
        method: 'PUT',
        body: JSON.stringify({ enabled })
      });
      
      if (response.success) {
        // Invalider le cache des buckets
        const cacheKey = `buckets_${this.credentials.region}`;
        cacheService.delete(cacheKey);
        console.log(`✅ Versioning ${enabled ? 'activé' : 'désactivé'} pour "${bucket}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la configuration du versioning',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setObjectTags(bucket: string, objectKey: string, tags: Record<string, string>): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🏷️ Mise à jour tags: ${bucket}/${objectKey}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags })
      });
      
      if (response.success) {
        // Invalider le cache des objets
        const cacheKey = `objects_${bucket}`;
        cacheService.clearByPattern(cacheKey);
        console.log(`✅ Tags mis à jour pour "${objectKey}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la mise à jour des tags',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteObjectTags(bucket: string, objectKey: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🗑️ Suppression tags: ${bucket}/${objectKey}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/tags`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Invalider le cache des objets
        const cacheKey = `objects_${bucket}`;
        cacheService.clearByPattern(cacheKey);
        console.log(`✅ Tags supprimés pour "${objectKey}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la suppression des tags',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setBucketEncryption(bucket: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🔒 Activation encryption: ${bucket}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/encryption`, {
        method: 'PUT'
      });
      
      if (response.success) {
        // Invalider le cache des buckets
        const cacheKey = `buckets_${this.credentials.region}`;
        cacheService.delete(cacheKey);
        console.log(`✅ Encryption activée pour "${bucket}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de l\'activation de l\'encryption',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteBucketEncryption(bucket: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🔓 Désactivation encryption: ${bucket}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/encryption`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        // Invalider le cache des buckets
        const cacheKey = `buckets_${this.credentials.region}`;
        cacheService.delete(cacheKey);
        console.log(`✅ Encryption désactivée pour "${bucket}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la désactivation de l\'encryption',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async listObjectVersions(bucket: string, objectKey?: string): Promise<ProxyS3Response<ObjectVersion[]>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const params = new URLSearchParams();
      if (objectKey) params.append('prefix', objectKey);
      
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/versions?${params.toString()}`;
      const response = await this.makeRequest<ObjectVersion[]>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des versions',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getObjectRetention(bucket: string, objectKey: string, versionId?: string): Promise<ProxyS3Response<ObjectRetention>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const params = new URLSearchParams();
      if (versionId) params.append('versionId', versionId);
      
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/retention?${params.toString()}`;
      const response = await this.makeRequest<ObjectRetention>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération de la rétention',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setObjectRetention(
    bucket: string,
    objectKey: string,
    retention: ObjectRetention,
    versionId?: string
  ): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const params = new URLSearchParams();
      if (versionId) params.append('versionId', versionId);
      
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/retention?${params.toString()}`;
      const response = await this.makeRequest<void>(endpoint, {
        method: 'PUT',
        body: JSON.stringify({ retention })
      });
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la configuration de la rétention',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getObjectLockConfiguration(bucket: string): Promise<ProxyS3Response<ObjectLockConfiguration>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/object-lock`;
      const response = await this.makeRequest<ObjectLockConfiguration>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération de la configuration Object Lock',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getObjectAcl(bucket: string, objectKey: string): Promise<ProxyS3Response<any>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/acl`;
      const response = await this.makeRequest<any>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des ACL',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Lifecycle Configuration
  async getBucketLifecycleConfiguration(bucket: string): Promise<ProxyS3Response<any>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/lifecycle`;
      const response = await this.makeRequest<any>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération de la configuration lifecycle',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async putBucketLifecycleConfiguration(bucket: string, configuration: any): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`⚙️ Configuration lifecycle: ${bucket}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/lifecycle`, {
        method: 'PUT',
        body: JSON.stringify({ configuration })
      });
      
      if (response.success) {
        cacheService.delete(`buckets_${this.credentials.region}`);
        console.log(`✅ Lifecycle configuré pour "${bucket}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la configuration lifecycle',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async deleteBucketLifecycle(bucket: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      console.log(`🗑️ Suppression lifecycle: ${bucket}`);
      const response = await this.makeRequest<void>(`/buckets/${encodeURIComponent(bucket)}/lifecycle`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        cacheService.delete(`buckets_${this.credentials.region}`);
        console.log(`✅ Lifecycle supprimé pour "${bucket}"`);
      }
      
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la suppression de la configuration lifecycle',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Head Operations
  async headBucket(bucket: string): Promise<ProxyS3Response<any>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/head`;
      const response = await this.makeRequest<any>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la vérification du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async headObject(bucket: string, objectKey: string): Promise<ProxyS3Response<any>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/head`;
      const response = await this.makeRequest<any>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la vérification de l\'objet',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Presigned URLs
  async getPresignedUrl(bucket: string, objectKey: string, expiresIn?: number): Promise<ProxyS3Response<{ url: string }>> {
    if (!this.credentials) {
      return { success: false, error: 'Service non initialisé' };
    }

    try {
      const params = new URLSearchParams();
      if (expiresIn) params.append('expiresIn', expiresIn.toString());
      
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/presigned?${params.toString()}`;
      const response = await this.makeRequest<{ url: string }>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la génération de l\'URL pré-signée',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getBucketAcl(bucket: string): Promise<ProxyS3Response<BucketAcl>> {
    if (!this.credentials) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/acl`;
      const response = await this.makeRequest<BucketAcl>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération des ACL du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async getBucketPolicy(bucket: string): Promise<ProxyS3Response<BucketPolicy>> {
    if (!this.credentials) {
      return { success: false, error: 'Client S3 non initialisé' };
    }

    try {
      const endpoint = `/buckets/${encodeURIComponent(bucket)}/policy`;
      const response = await this.makeRequest<BucketPolicy>(endpoint);
      return response;
    } catch (error) {
      return {
        success: false,
        error: 'Erreur lors de la récupération de la policy du bucket',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  async setBucketPolicy(bucket: string, policy: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/policy`, { method: 'PUT', body: JSON.stringify({ policy }) });
  }

  async deleteBucketPolicy(bucket: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/policy`, { method: 'DELETE' });
  }

  async setBucketAcl(bucket: string, acl: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/acl`, { method: 'PUT', body: JSON.stringify({ acl }) });
  }

  async getBucketCors(bucket: string): Promise<ProxyS3Response<{ corsRules: any[] }>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/cors`);
  }

  async setBucketCors(bucket: string, corsRules: any[]): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/cors`, { method: 'PUT', body: JSON.stringify({ corsRules }) });
  }

  async deleteBucketCors(bucket: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/cors`, { method: 'DELETE' });
  }

  async getBucketWebsite(bucket: string): Promise<ProxyS3Response<{ indexDocument?: string; errorDocument?: string }>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/website`);
  }

  async setBucketWebsite(bucket: string, indexDocument: string, errorDocument?: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/website`, { method: 'PUT', body: JSON.stringify({ indexDocument, errorDocument }) });
  }

  async deleteBucketWebsite(bucket: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/website`, { method: 'DELETE' });
  }

  async setBucketObjectLock(bucket: string, mode: string, days: number): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/object-lock`, { method: 'PUT', body: JSON.stringify({ mode, days }) });
  }

  async setObjectAcl(bucket: string, objectKey: string, acl: string): Promise<ProxyS3Response<void>> {
    if (!this.credentials) return { success: false, error: 'Service non initialisé' };
    return this.makeRequest(`/buckets/${encodeURIComponent(bucket)}/objects/${encodeURIComponent(objectKey)}/acl`, { method: 'PUT', body: JSON.stringify({ acl }) });
  }

  isInitialized(): boolean {
    return !!this.credentials;
  }
}

export const proxyS3Service = new ProxyS3Service();