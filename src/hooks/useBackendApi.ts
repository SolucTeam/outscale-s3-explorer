
import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { useS3Store } from './useS3Store';
import { useToast } from '@/hooks/use-toast';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';

export const useBackendApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setBuckets, setObjects, setCredentials, setCurrentBucket } = useS3Store();
  const { toast } = useToast();

  const initialize = useCallback(async (credentials: S3Credentials): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiService.login(credentials);
      
      if (response.success) {
        setCredentials(credentials);
        return true;
      } else {
        throw new Error(response.message || 'Échec de la connexion');
      }
    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
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
    setIsLoading(true);
    try {
      const response = await apiService.getBuckets();
      
      if (response.success && response.data) {
        // Convert API response to S3Bucket format
        const s3Buckets: S3Bucket[] = response.data.map(bucket => ({
          name: bucket.name,
          creationDate: new Date(bucket.creationDate),
          region: bucket.region,
          objectCount: bucket.objectCount || 0,
          size: bucket.size || 0
        }));
        
        setBuckets(s3Buckets);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des buckets:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les buckets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setBuckets, toast]);

  const createBucket = useCallback(async (name: string, region?: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.createBucket(name, region);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Le bucket "${name}" a été créé avec succès`
        });
        
        // Refresh buckets list
        await fetchBuckets();
      } else {
        throw new Error(response.message || 'Erreur lors de la création du bucket');
      }
    } catch (error) {
      console.error('Erreur lors de la création du bucket:', error);
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
    setIsLoading(true);
    try {
      const response = await apiService.deleteBucket(name);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Le bucket "${name}" a été supprimé avec succès`
        });
        
        // Refresh buckets list
        await fetchBuckets();
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du bucket:', error);
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
    setIsLoading(true);
    try {
      const response = await apiService.getObjects(bucket, path);
      
      if (response.success && response.data) {
        // Convert API response to S3Object format
        const s3Objects: S3Object[] = response.data.map(obj => ({
          key: obj.key,
          lastModified: new Date(obj.lastModified),
          size: obj.size,
          etag: obj.etag,
          storageClass: obj.storageClass,
          isFolder: obj.isFolder
        }));
        
        setObjects(s3Objects);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des objets:', error);
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
    setIsLoading(true);
    try {
      const response = await apiService.uploadFile(file, bucket, path);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Le fichier "${file.name}" a été uploadé avec succès`
        });
        
        // Refresh objects list
        await fetchObjects(bucket, path);
      } else {
        throw new Error(response.message || 'Erreur lors de l\'upload du fichier');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
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
    setIsLoading(true);
    try {
      const response = await apiService.deleteObject(bucket, objectKey);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "L'objet a été supprimé avec succès"
        });
        
        // Refresh objects list
        await fetchObjects(bucket);
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression de l\'objet');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'objet",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast]);

  const downloadObject = useCallback(async (bucket: string, objectKey: string) => {
    try {
      const response = await apiService.getDownloadUrl(bucket, objectKey);
      
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
      } else {
        throw new Error(response.message || 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'objet",
        variant: "destructive"
      });
    }
  }, [toast]);

  const createFolder = useCallback(async (bucket: string, path: string, folderName: string) => {
    setIsLoading(true);
    try {
      const response = await apiService.createFolder(bucket, path, folderName);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Le dossier "${folderName}" a été créé avec succès`
        });
        
        // Refresh objects list
        await fetchObjects(bucket, path);
      } else {
        throw new Error(response.message || 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
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
    try {
      await apiService.logout();
      setCredentials(null);
      setBuckets([]);
      setObjects([]);
      setCurrentBucket(null);
      
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
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
