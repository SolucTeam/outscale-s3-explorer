import { useS3Store } from './useS3Store';
import { apiService, ApiResponse } from '../services/apiService';
import { useToast } from '@/components/ui/use-toast';
import { S3Bucket, S3Object } from '../types/s3';
import { useRetryState } from './useRetryState';
import { RetryService } from '../services/retryService';

export const useFlaskApi = () => {
  const { 
    setBuckets, 
    setObjects, 
    setLoading, 
    setError,
    logout: storeLogout 
  } = useS3Store();
  const { toast } = useToast();
  const retryState = useRetryState();

  const handleApiError = (response: ApiResponse<any>, defaultMessage: string) => {
    const errorMessage = response.error || response.message || defaultMessage;
    setError(errorMessage);
    toast({
      title: "Erreur",
      description: response.message || errorMessage,
      variant: "destructive"
    });
    return false;
  };

  const fetchBuckets = async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await retryState.execute(
        () => apiService.getBuckets(),
        RetryService.getRetryConfig('bucket')
      );
      
      if (response.success && response.data) {
        const buckets: S3Bucket[] = response.data.map(bucket => ({
          name: bucket.name,
          creationDate: new Date(bucket.creationDate),
          region: bucket.region,
          objectCount: bucket.objectCount || 0,
          size: bucket.size || 0
        }));
        
        setBuckets(buckets);
        return true;
      } else {
        return handleApiError(response, 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('Fetch buckets error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const createBucket = async (name: string, region: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await retryState.execute(
        () => apiService.createBucket(name, region),
        RetryService.getRetryConfig('bucket')
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" créé avec succès`
        });
        return true;
      } else {
        return handleApiError(response, 'Erreur lors de la création du bucket');
      }
    } catch (error) {
      console.error('Create bucket error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteBucket = async (name: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await retryState.execute(
        () => apiService.deleteBucket(name),
        RetryService.getRetryConfig('bucket')
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" supprimé avec succès`
        });
        await fetchBuckets(); // Actualiser la liste
        return true;
      } else {
        return handleApiError(response, 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      console.error('Delete bucket error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const fetchObjects = async (bucket: string, path: string = ''): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await retryState.execute(
        () => apiService.getObjects(bucket, path),
        RetryService.getRetryConfig('object')
      );
      
      if (response.success && response.data) {
        const objects: S3Object[] = response.data.map(obj => ({
          key: obj.key,
          lastModified: new Date(obj.lastModified),
          size: obj.size,
          etag: obj.etag,
          storageClass: obj.storageClass,
          isFolder: obj.isFolder
        }));
        
        setObjects(objects);
        return true;
      } else {
        return handleApiError(response, 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('Fetch objects error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    } finally {
      setLoading(false);
    }
  };

  const uploadFile = async (file: File, bucket: string, path: string = ''): Promise<boolean> => {
    try {
      const response = await retryState.execute(
        () => apiService.uploadFile(file, bucket, path),
        RetryService.getRetryConfig('upload')
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Fichier "${file.name}" uploadé avec succès`
        });
        return true;
      } else {
        return handleApiError(response, 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    }
  };

  const deleteObject = async (bucket: string, objectKey: string): Promise<boolean> => {
    try {
      const response = await retryState.execute(
        () => apiService.deleteObject(bucket, objectKey),
        RetryService.getRetryConfig('object')
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Objet supprimé avec succès"
        });
        return true;
      } else {
        return handleApiError(response, 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete object error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    }
  };

  const downloadObject = async (bucket: string, objectKey: string): Promise<void> => {
    try {
      const response = await retryState.execute(
        () => apiService.downloadObject(bucket, objectKey),
        RetryService.getRetryConfig('object')
      );
      
      if (response.success && response.data?.url) {
        // Ouvrir l'URL de téléchargement dans un nouvel onglet
        window.open(response.data.url, '_blank');
      } else {
        handleApiError(response, 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      console.error('Download error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
    }
  };

  const createFolder = async (bucket: string, path: string, folderName: string): Promise<boolean> => {
    try {
      const response = await retryState.execute(
        () => apiService.createFolder(bucket, path, folderName),
        RetryService.getRetryConfig('object')
      );
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Dossier "${folderName}" créé avec succès`
        });
        return true;
      } else {
        return handleApiError(response, 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      if (!retryState.isRetrying) {
        setError('Erreur de connexion');
      }
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await apiService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      storeLogout();
    }
  };

  return {
    fetchBuckets,
    createBucket,
    deleteBucket,
    fetchObjects,
    uploadFile,
    deleteObject,
    downloadObject,
    createFolder,
    logout,
    retryState, // Exposer l'état de retry pour les composants
    cacheStats: apiService.getCacheStats,
    clearCache: apiService.clearCache
  };
};
