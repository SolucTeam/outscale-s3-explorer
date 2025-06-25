
import { useState, useCallback } from 'react';
import { directS3Service, DirectS3Response } from '../services/directS3Service';
import { useS3Store } from './useS3Store';
import { S3Bucket, S3Object, S3Credentials } from '../types/s3';
import { useToast } from '@/hooks/use-toast';

export const useDirectS3 = () => {
  const { 
    setBuckets, 
    setObjects, 
    setLoading, 
    setError,
    logout: storeLogout 
  } = useS3Store();
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

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
      const response = await directS3Service.initialize(credentials);
      
      if (response.success) {
        setInitialized(true);
        return true;
      } else {
        return handleError(response, 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      console.error('Initialize error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBuckets = useCallback(async (): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.getBuckets();
      
      if (response.success && response.data) {
        setBuckets(response.data);
        return true;
      } else {
        return handleError(response, 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('Fetch buckets error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const createBucket = useCallback(async (name: string, region: string): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.createBucket(name);
      
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
      console.error('Create bucket error:', error);
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
      const response = await directS3Service.deleteBucket(name);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" supprimé avec succès`
        });
        await fetchBuckets();
        return true;
      } else {
        return handleError(response, 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      console.error('Delete bucket error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, fetchBuckets]);

  const fetchObjects = useCallback(async (bucket: string, path: string = ''): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.getObjects(bucket, path);
      
      if (response.success && response.data) {
        setObjects(response.data);
        return true;
      } else {
        return handleError(response, 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('Fetch objects error:', error);
      setError('Erreur de connexion');
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  const uploadFile = useCallback(async (file: File, bucket: string, path: string = ''): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await directS3Service.uploadFile(file, bucket, path);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Fichier "${file.name}" uploadé avec succès`
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Erreur de connexion');
      return false;
    }
  }, [initialized]);

  const deleteObject = useCallback(async (bucket: string, objectKey: string): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await directS3Service.deleteObject(bucket, objectKey);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Objet supprimé avec succès"
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Delete object error:', error);
      setError('Erreur de connexion');
      return false;
    }
  }, [initialized]);

  const downloadObject = useCallback(async (bucket: string, objectKey: string): Promise<void> => {
    if (!initialized) return;

    try {
      const response = await directS3Service.getDownloadUrl(bucket, objectKey);
      
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        handleError(response, 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      console.error('Download error:', error);
      setError('Erreur de connexion');
    }
  }, [initialized]);

  const createFolder = useCallback(async (bucket: string, path: string, folderName: string): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await directS3Service.createFolder(bucket, path, folderName);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Dossier "${folderName}" créé avec succès`
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('Create folder error:', error);
      setError('Erreur de connexion');
      return false;
    }
  }, [initialized]);

  const logout = useCallback((): void => {
    setInitialized(false);
    storeLogout();
  }, [storeLogout]);

  return {
    initialized,
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
