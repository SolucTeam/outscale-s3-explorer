import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { useS3Store } from './useS3Store';
import { useToast } from '@/hooks/use-toast';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';
import { s3LoggingService } from '../services/s3LoggingService';

export const useBackendApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setBuckets, setObjects, setCredentials, setCurrentBucket, currentPath } = useS3Store();
  const { toast } = useToast();

  const initialize = useCallback(async (credentials: S3Credentials): Promise<boolean> => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_create', // Using as connection test
      undefined,
      undefined,
      `Connexion avec la région ${credentials.region}`
    );
    
    setIsLoading(true);
    console.log('🔌 Début de l\'initialisation de la connexion...');
    
    try {
      const response = await apiService.login(credentials);
      
      if (response.success) {
        setCredentials(credentials);
        const duration = performance.now() - startTime;
        console.log(`✅ Connexion établie en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'bucket_create',
          undefined,
          undefined,
          `Connexion établie en ${duration.toFixed(2)}ms`
        );
        return true;
      } else {
        throw new Error(response.message || 'Échec de la connexion');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de connexion après ${duration.toFixed(2)}ms:`, error);
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
        description: error instanceof Error ? error.message : "Impossible de se connecter au serveur. Vérifiez que le backend est démarré.",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setCredentials, toast]);

  const fetchBuckets = useCallback(async () => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('bucket_create', undefined, undefined, 'Chargement de la liste des buckets');
    
    setIsLoading(true);
    console.log('📦 Début du chargement des buckets...');
    
    try {
      const response = await apiService.getBuckets();
      
      if (response.success && response.data) {
        const s3Buckets: S3Bucket[] = response.data.map(bucket => ({
          name: bucket.name,
          creationDate: new Date(bucket.creationDate),
          region: bucket.region,
          objectCount: bucket.objectCount || 0,
          size: bucket.size || 0
        }));
        
        setBuckets(s3Buckets);
        const duration = performance.now() - startTime;
        console.log(`✅ ${s3Buckets.length} buckets chargés en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'bucket_create',
          undefined,
          undefined,
          `${s3Buckets.length} buckets chargés en ${duration.toFixed(2)}ms`
        );
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de chargement des buckets après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_create',
        error instanceof Error ? error : 'Erreur réseau',
        undefined,
        undefined,
        'FETCH_BUCKETS_FAILED'
      );
      
      // Fournir des conseils de dépannage selon le type d'erreur
      let errorMessage = "Impossible de charger les buckets";
      if (error instanceof Error) {
        if (error.message.includes('fetch')) {
          errorMessage = "Serveur indisponible. Vérifiez que le backend est démarré sur le port 5000.";
        } else if (error.message.includes('401') || error.message.includes('403')) {
          errorMessage = "Session expirée. Reconnectez-vous.";
        } else if (error.message.includes('timeout')) {
          errorMessage = "Délai d'attente dépassé. Le serveur met trop de temps à répondre.";
        }
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setBuckets, toast]);

  const createBucket = useCallback(async (name: string, region?: string) => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('bucket_create', name, undefined, `Région: ${region || 'par défaut'}`);
    
    setIsLoading(true);
    console.log(`🆕 Création du bucket "${name}"...`);
    
    try {
      const response = await apiService.createBucket(name, region);
      
      if (response.success) {
        const duration = performance.now() - startTime;
        console.log(`✅ Bucket "${name}" créé en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(logEntryId, 'bucket_create', name, undefined, `Bucket créé en ${duration.toFixed(2)}ms`);
        toast({
          title: "Succès",
          description: `Le bucket "${name}" a été créé avec succès`
        });
        
        await fetchBuckets();
      } else {
        throw new Error(response.message || 'Erreur lors de la création du bucket');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de création du bucket après ${duration.toFixed(2)}ms:`, error);
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
  }, [fetchBuckets, toast]);

  const deleteBucket = useCallback(async (name: string) => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('bucket_delete', name);
    
    setIsLoading(true);
    console.log(`🗑️ Suppression du bucket "${name}"...`);
    
    try {
      const response = await apiService.deleteBucket(name);
      
      if (response.success) {
        const duration = performance.now() - startTime;
        console.log(`✅ Bucket "${name}" supprimé en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(logEntryId, 'bucket_delete', name, undefined, `Bucket supprimé en ${duration.toFixed(2)}ms`);
        toast({
          title: "Succès",
          description: `Le bucket "${name}" a été supprimé avec succès`
        });
        
        await fetchBuckets();
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de suppression du bucket après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_delete',
        error instanceof Error ? error : 'Erreur réseau',
        name,
        undefined,
        'DELETE_BUCKET_FAILED'
      );
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le bucket",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchBuckets, toast]);

  const fetchObjects = useCallback(async (bucket: string, path: string = '') => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('object_download', bucket, path || 'racine', 'Chargement des objets');
    
    setIsLoading(true);
    console.log(`📁 Chargement des objets du bucket "${bucket}" (${path || 'racine'})...`);
    
    try {
      const response = await apiService.getObjects(bucket, path);
      
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
        const duration = performance.now() - startTime;
        console.log(`✅ ${s3Objects.length} objets chargés en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'object_download',
          bucket,
          path || 'racine',
          `${s3Objects.length} objets chargés en ${duration.toFixed(2)}ms`
        );
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de chargement des objets après ${duration.toFixed(2)}ms:`, error);
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
  }, [setObjects, toast]);

  const uploadFile = useCallback(async (file: File, bucket: string, path: string = '') => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('object_upload', bucket, file.name, `Taille: ${file.size} bytes`);
    
    setIsLoading(true);
    console.log(`⬆️ Upload de "${file.name}" (${file.size} bytes)...`);
    
    try {
      const response = await apiService.uploadFile(file, bucket, path);
      
      if (response.success) {
        const duration = performance.now() - startTime;
        console.log(`✅ Upload réussi en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(logEntryId, 'object_upload', bucket, file.name, `Upload réussi en ${duration.toFixed(2)}ms`);
        toast({
          title: "Succès",
          description: `Le fichier "${file.name}" a été uploadé avec succès`
        });
        
        await fetchObjects(bucket, path);
      } else {
        throw new Error(response.message || 'Erreur lors de l\'upload du fichier');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur d'upload après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'object_upload',
        error instanceof Error ? error : 'Erreur réseau',
        bucket,
        file.name,
        'UPLOAD_FAILED'
      );
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'uploader le fichier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast]);

  const deleteObject = useCallback(async (bucket: string, objectKey: string) => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('object_delete', bucket, objectKey);
    
    setIsLoading(true);
    console.log(`🗑️ Suppression de l'objet "${objectKey}"...`);
    
    try {
      const response = await apiService.deleteObject(bucket, objectKey);
      
      if (response.success) {
        const duration = performance.now() - startTime;
        console.log(`✅ Objet supprimé en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(logEntryId, 'object_delete', bucket, objectKey, `Suppression réussie en ${duration.toFixed(2)}ms`);
        toast({
          title: "Succès",
          description: "L'objet a été supprimé avec succès"
        });
        
        await fetchObjects(bucket, currentPath);
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression de l\'objet');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de suppression après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'object_delete',
        error instanceof Error ? error : 'Erreur réseau',
        bucket,
        objectKey,
        'DELETE_FAILED'
      );
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'objet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast, currentPath]);

  const downloadObject = useCallback(async (bucket: string, objectKey: string) => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('object_download', bucket, objectKey);
    
    console.log(`⬇️ Génération du lien de téléchargement pour "${objectKey}"...`);
    
    try {
      const response = await apiService.getDownloadUrl(bucket, objectKey);
      
      if (response.success && response.data?.url) {
        const duration = performance.now() - startTime;
        console.log(`✅ Lien généré en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(logEntryId, 'object_download', bucket, objectKey, `Lien généré en ${duration.toFixed(2)}ms`);
        window.open(response.data.url, '_blank');
      } else {
        throw new Error(response.message || 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de téléchargement après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'object_download',
        error instanceof Error ? error : 'Erreur réseau',
        bucket,
        objectKey,
        'DOWNLOAD_FAILED'
      );
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'objet",
        variant: "destructive"
      });
    }
  }, [toast]);

  const createFolder = useCallback(async (bucket: string, path: string, folderName: string) => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('folder_create', bucket, folderName, `Chemin: ${path}`);
    
    setIsLoading(true);
    console.log(`📁 Création du dossier "${folderName}"...`);
    
    try {
      const response = await apiService.createFolder(bucket, path, folderName);
      
      if (response.success) {
        const duration = performance.now() - startTime;
        console.log(`✅ Dossier créé en ${duration.toFixed(2)}ms`);
        s3LoggingService.logOperationSuccess(logEntryId, 'folder_create', bucket, folderName, `Dossier créé en ${duration.toFixed(2)}ms`);
        toast({
          title: "Succès",
          description: `Le dossier "${folderName}" a été créé avec succès`
        });
        
        await fetchObjects(bucket, path);
      } else {
        throw new Error(response.message || 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de création du dossier après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'folder_create',
        error instanceof Error ? error : 'Erreur réseau',
        bucket,
        folderName,
        'CREATE_FOLDER_FAILED'
      );
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le dossier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast]);

  const logout = useCallback(async () => {
    const startTime = performance.now();
    const logEntryId = s3LoggingService.logOperationStart('bucket_delete', undefined, undefined, 'Déconnexion en cours');
    
    console.log('🚪 Déconnexion...');
    
    try {
      await apiService.logout();
      setCredentials(null);
      setBuckets([]);
      setObjects([]);
      setCurrentBucket(null);
      
      const duration = performance.now() - startTime;
      console.log(`✅ Déconnexion réussie en ${duration.toFixed(2)}ms`);
      s3LoggingService.logOperationSuccess(logEntryId, 'bucket_delete', undefined, undefined, `Déconnexion réussie en ${duration.toFixed(2)}ms`);
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès"
      });
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`❌ Erreur de déconnexion après ${duration.toFixed(2)}ms:`, error);
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_delete',
        error instanceof Error ? error : 'Erreur réseau',
        undefined,
        undefined,
        'LOGOUT_FAILED'
      );
      // Even if logout fails on server, clear local state
      setCredentials(null);
      setBuckets([]);
      setObjects([]);
      setCurrentBucket(null);
    }
  }, [setCredentials, setBuckets, setObjects, setCurrentBucket, toast]);

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
    logout
  };
};
