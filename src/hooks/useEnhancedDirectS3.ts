/**
 * Hook S3 direct amélioré avec cache intelligent, retry automatique et uploads concurrents
 * Version optimisée pour performance et fiabilité
 */

import { useState, useCallback, useRef } from 'react';
import { directS3Service, DirectS3Response } from '../services/directS3Service';
import { useS3Store } from './useS3Store';
import { S3Bucket, S3Object, S3Credentials } from '../types/s3';
import { useToast } from '@/hooks/use-toast';
import { cacheService } from '../services/cacheService';

interface UploadProgress {
  file: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export const useEnhancedDirectS3 = () => {
  const { 
    setBuckets, 
    setObjects, 
    setLoading, 
    setError,
    logout: storeLogout 
  } = useS3Store();
  
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, UploadProgress>>({});
  const uploadQueueRef = useRef<File[]>([]);
  const activeUploadsRef = useRef<Set<string>>(new Set());
  
  const retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000
  };

  // Backoff exponentiel pour retry automatique
  const exponentialBackoff = (attempt: number): number => {
    const delay = Math.min(
      retryConfig.baseDelay * Math.pow(2, attempt),
      retryConfig.maxDelay
    );
    return delay + Math.random() * 1000; // Jitter
  };

  // Retry automatique avec backoff
  const withRetry = async <T>(
    operation: () => Promise<DirectS3Response<T>>,
    context: string
  ): Promise<DirectS3Response<T>> => {
    let lastError: any;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const result = await operation();
        if (result.success || attempt === retryConfig.maxRetries) {
          return result;
        }
        lastError = result.error;
      } catch (error) {
        lastError = error;
        if (attempt === retryConfig.maxRetries) break;
      }
      
      if (attempt < retryConfig.maxRetries) {
        const delay = exponentialBackoff(attempt);
        console.log(`🔄 Retry ${attempt + 1}/${retryConfig.maxRetries} pour ${context} dans ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: `Échec après ${retryConfig.maxRetries + 1} tentatives`,
      message: lastError?.message || 'Erreur inconnue'
    };
  };

  const handleError = (response: DirectS3Response<any>, defaultMessage: string) => {
    const errorMessage = response.error || response.message || defaultMessage;
    setError(errorMessage);
    toast({
      title: "Erreur",
      description: response.message || errorMessage,
      variant: "destructive"
    });
    return false;
  };

  const initialize = useCallback(async (credentials: S3Credentials): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Initialisation S3 direct avec cache intelligent');
      const response = await withRetry(
        () => directS3Service.initialize(credentials),
        'initialisation S3'
      );
      
      if (response.success) {
        setInitialized(true);
        console.log('✅ S3 initialisé avec succès');
        return true;
      } else {
        return handleError(response, 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      console.error('❌ Initialize error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBuckets = useCallback(async (forceRefresh: boolean = false): Promise<boolean> => {
    if (!initialized) return false;
    
    if (forceRefresh) {
      cacheService.clearByPattern('buckets_');
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await withRetry(
        () => directS3Service.getBuckets(),
        'récupération buckets'
      );
      
      if (response.success && response.data) {
        setBuckets(response.data);
        return true;
      } else {
        return handleError(response, 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('❌ Fetch buckets error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const fetchObjects = useCallback(async (bucket: string, path: string = '', forceRefresh: boolean = false): Promise<boolean> => {
    if (!initialized) return false;
    
    if (forceRefresh) {
      cacheService.clearByPattern(`objects_${bucket}`);
    }
    
    setLoading(true);
    setError(null);

    try {
      const response = await withRetry(
        () => directS3Service.getObjects(bucket, path),
        `récupération objects ${bucket}/${path}`
      );
      
      if (response.success && response.data) {
        setObjects(response.data);
        return true;
      } else {
        return handleError(response, 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('❌ Fetch objects error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  // Upload concurrent avec limite de 5 uploads simultanés
  const uploadFile = useCallback(async (file: File, bucket: string, path: string = ''): Promise<boolean> => {
    if (!initialized) return false;

    const fileKey = `${bucket}/${path}/${file.name}`;
    
    // Ajouter à la queue si trop d'uploads actifs
    if (activeUploadsRef.current.size >= 5) {
      uploadQueueRef.current.push(file);
      setUploadProgress(prev => ({
        ...prev,
        [fileKey]: { file: file.name, progress: 0, status: 'pending' }
      }));
      return true;
    }

    activeUploadsRef.current.add(fileKey);
    setUploadProgress(prev => ({
      ...prev,
      [fileKey]: { file: file.name, progress: 0, status: 'uploading' }
    }));

    try {
      // Simuler progression (AWS SDK ne fournit pas de progress natif)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[fileKey];
          if (current && current.progress < 90) {
            return {
              ...prev,
              [fileKey]: { ...current, progress: current.progress + 10 }
            };
          }
          return prev;
        });
      }, 200);

      const response = await withRetry(
        () => directS3Service.uploadFile(file, bucket, path),
        `upload ${file.name}`
      );

      clearInterval(progressInterval);

      if (response.success) {
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { file: file.name, progress: 100, status: 'completed' }
        }));
        
        // Invalider le cache des objets
        cacheService.clearByPattern(`objects_${bucket}`);
        
        toast({
          title: "Succès",
          description: `Fichier "${file.name}" uploadé avec succès`
        });
        
        return true;
      } else {
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { 
            file: file.name, 
            progress: 0, 
            status: 'error',
            error: response.error 
          }
        }));
        return handleError(response, 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [fileKey]: { 
          file: file.name, 
          progress: 0, 
          status: 'error',
          error: 'Erreur de connexion' 
        }
      }));
      setError('Erreur de connexion');
      return false;
    } finally {
      activeUploadsRef.current.delete(fileKey);
      
      // Traiter la queue
      if (uploadQueueRef.current.length > 0) {
        const nextFile = uploadQueueRef.current.shift();
        if (nextFile) {
          setTimeout(() => uploadFile(nextFile, bucket, path), 100);
        }
      }
      
      // Nettoyer l'état après 5 secondes
      setTimeout(() => {
        setUploadProgress(prev => {
          const newState = { ...prev };
          delete newState[fileKey];
          return newState;
        });
      }, 5000);
    }
  }, [initialized]);

  const createBucket = useCallback(async (name: string, region: string): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await withRetry(
        () => directS3Service.createBucket(name),
        `création bucket ${name}`
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" créé avec succès`
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la création du bucket');
      }
    } catch (error) {
      console.error('❌ Create bucket error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const deleteBucket = useCallback(async (name: string): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await withRetry(
        () => directS3Service.deleteBucket(name),
        `suppression bucket ${name}`
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" supprimé avec succès`
        });
        await fetchBuckets(true); // Force refresh
        return true;
      } else {
        return handleError(response, 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      console.error('❌ Delete bucket error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, fetchBuckets]);

  const deleteObject = useCallback(async (bucket: string, objectKey: string): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await withRetry(
        () => directS3Service.deleteObject(bucket, objectKey),
        `suppression objet ${objectKey}`
      );
      
      if (response.success) {
        // Invalider le cache des objets
        cacheService.clearByPattern(`objects_${bucket}`);
        
        toast({
          title: "Succès",
          description: "Objet supprimé avec succès"
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Delete object error:', error);
      setError('Erreur de connexion');
      return false;
    }
  }, [initialized]);

  const downloadObject = useCallback(async (bucket: string, objectKey: string): Promise<void> => {
    if (!initialized) return;

    try {
      const response = await withRetry(
        () => directS3Service.getDownloadUrl(bucket, objectKey),
        `téléchargement ${objectKey}`
      );
      
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        handleError(response, 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      setError('Erreur de connexion');
    }
  }, [initialized]);

  const createFolder = useCallback(async (bucket: string, path: string, folderName: string): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await withRetry(
        () => directS3Service.createFolder(bucket, path, folderName),
        `création dossier ${folderName}`
      );
      
      if (response.success) {
        // Invalider le cache des objets
        cacheService.clearByPattern(`objects_${bucket}`);
        
        toast({
          title: "Succès",
          description: `Dossier "${folderName}" créé avec succès`
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('❌ Create folder error:', error);
      setError('Erreur de connexion');
      return false;
    }
  }, [initialized]);

  const logout = useCallback((): void => {
    console.log('🚪 Déconnexion et nettoyage du cache');
    setInitialized(false);
    setUploadProgress({});
    uploadQueueRef.current = [];
    activeUploadsRef.current.clear();
    cacheService.clear();
    storeLogout();
  }, [storeLogout]);

  const getCacheStats = useCallback(() => {
    return cacheService.getStats();
  }, []);

  return {
    initialized,
    uploadProgress,
    initialize,
    fetchBuckets,
    createBucket,
    deleteBucket,
    fetchObjects,
    uploadFile,
    deleteObject,
    downloadObject,
    createFolder,
    logout,
    getCacheStats
  };
};