
import { useState, useCallback } from 'react';
import { enhancedApiService } from '../services/enhancedApiService';
import { useS3Store } from './useS3Store';
import { useToast } from '@/hooks/use-toast';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { s3LoggingService } from '../services/s3LoggingService';

export const useEnhancedBackendApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { 
    setBuckets, 
    setObjects, 
    setCredentials, 
    setCurrentBucket, 
    currentPath,
    credentials 
  } = useS3Store();
  const { toast } = useToast();

  const getUserId = () => credentials?.accessKey || 'anonymous';

  const initialize = useCallback(async (creds: S3Credentials): Promise<boolean> => {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_create',
      undefined,
      undefined,
      `Connexion avec la région ${creds.region}`
    );
    
    setIsLoading(true);
    try {
      const response = await enhancedApiService.login(creds);
      
      if (response.success) {
        setCredentials(creds);
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'bucket_create',
          undefined,
          undefined,
          'Connexion établie avec succès'
        );
        return true;
      } else {
        throw new Error(response.message || 'Échec de la connexion');
      }
    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_create',
        error instanceof Error ? error : 'Erreur de connexion',
        undefined,
        undefined,
        'CONNECTION_FAILED'
      );
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Impossible de se connecter",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setCredentials, toast]);

  const fetchBuckets = useCallback(async () => {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_create', 
      undefined, 
      undefined, 
      'Chargement de la liste des buckets'
    );
    
    setIsLoading(true);
    try {
      const userId = getUserId();
      const region = credentials?.region || 'eu-west-2';
      const response = await enhancedApiService.getBuckets(userId, region);
      
      if (response.success && response.data) {
        const s3Buckets: S3Bucket[] = response.data.map(bucket => ({
          name: bucket.name,
          creationDate: new Date(bucket.creationDate),
          region: bucket.region,
          objectCount: bucket.objectCount || 0,
          size: bucket.size || 0
        }));
        
        setBuckets(s3Buckets);
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'bucket_create',
          undefined,
          undefined,
          `${s3Buckets.length} buckets chargés (cache: ${response.data ? 'hit' : 'miss'})`
        );
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des buckets:', error);
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_create',
        error instanceof Error ? error : 'Erreur réseau',
        undefined,
        undefined,
        'FETCH_BUCKETS_FAILED'
      );
      toast({
        title: "Erreur",
        description: "Impossible de charger les buckets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setBuckets, toast, credentials]);

  const createBucket = useCallback(async (name: string, region?: string) => {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_create', 
      name, 
      undefined, 
      `Région: ${region || 'par défaut'}`
    );
    
    setIsLoading(true);
    try {
      const userId = getUserId();
      const response = await enhancedApiService.createBucket(name, region, userId);
      
      if (response.success) {
        s3LoggingService.logOperationSuccess(
          logEntryId, 
          'bucket_create', 
          name, 
          undefined, 
          'Bucket créé avec succès'
        );
        toast({
          title: "Succès",
          description: `Le bucket "${name}" a été créé avec succès`
        });
        
        await fetchBuckets();
      } else {
        throw new Error(response.message || 'Erreur lors de la création du bucket');
      }
    } catch (error) {
      console.error('Erreur lors de la création du bucket:', error);
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_create',
        error instanceof Error ? error : 'Erreur réseau',
        name,
        undefined,
        'CREATE_BUCKET_FAILED'
      );
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le bucket",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchBuckets, toast, credentials]);

  // Autres méthodes similaires avec logging amélioré...
  const fetchObjects = useCallback(async (bucket: string, path: string = '') => {
    const logEntryId = s3LoggingService.logOperationStart(
      'object_download', 
      bucket, 
      path || 'racine', 
      'Chargement des objets'
    );
    
    setIsLoading(true);
    try {
      const userId = getUserId();
      const response = await enhancedApiService.getObjects(bucket, path, userId);
      
      if (response.success && response.data) {
        const s3Objects: S3Object[] = response.data.map(obj => ({
          key: obj.key,
          lastModified: new Date(obj.lastModified),
          size: obj.size,
          etag: obj.etag,
          storageClass: obj.storageClass,
          isFolder: obj.isFolder
        }));
        
        setObjects(s3Objects);
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'object_download',
          bucket,
          path || 'racine',
          `${s3Objects.length} objets chargés`
        );
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des objets:', error);
      s3LoggingService.logOperationError(
        logEntryId,
        'object_download',
        error instanceof Error ? error : 'Erreur réseau',
        bucket,
        path,
        'FETCH_OBJECTS_FAILED'
      );
      toast({
        title: "Erreur",
        description: "Impossible de charger les objets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setObjects, toast, credentials]);

  // Delegate other methods to original implementation for now
  const { 
    deleteBucket,
    uploadFile,
    deleteObject,
    downloadObject,
    createFolder,
    logout
  } = require('./useBackendApi').useBackendApi();

  return {
    isLoading,
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
    // Cache management
    clearCache: () => enhancedApiService.clearCache(),
    getCacheStats: () => enhancedApiService.getCacheStats()
  };
};
