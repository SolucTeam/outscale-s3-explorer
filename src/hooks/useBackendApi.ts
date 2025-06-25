import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { useS3Store } from './useS3Store';
import { useToast } from '@/hooks/use-toast';
import { useActivityLogs } from './useActivityLogs';
import { S3Credentials, S3Bucket, S3Object } from '../types/s3';

export const useBackendApi = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { setBuckets, setObjects, setCredentials, setCurrentBucket } = useS3Store();
  const { toast } = useToast();
  const { startAction, completeAction, addLog } = useActivityLogs();

  const initialize = useCallback(async (credentials: S3Credentials): Promise<boolean> => {
    const actionId = startAction(
      'Initialisation de la connexion',
      `Connexion avec la région ${credentials.region}`,
      undefined,
      undefined
    );
    
    setIsLoading(true);
    try {
      const response = await apiService.login(credentials);
      
      if (response.success) {
        setCredentials(credentials);
        completeAction(actionId, true, 'Connexion établie avec succès');
        return true;
      } else {
        throw new Error(response.message || 'Échec de la connexion');
      }
    } catch (error) {
      console.error('Erreur d\'initialisation:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de connexion');
      toast({
        title: "Erreur de connexion",
        description: error instanceof Error ? error.message : "Impossible de se connecter",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [setCredentials, toast, startAction, completeAction]);

  const fetchBuckets = useCallback(async () => {
    const actionId = startAction('Chargement des buckets', 'Récupération de la liste des buckets');
    
    setIsLoading(true);
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
        completeAction(actionId, true, `${s3Buckets.length} bucket(s) chargé(s)`);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des buckets:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de chargement');
      toast({
        title: "Erreur",
        description: "Impossible de charger les buckets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setBuckets, toast, startAction, completeAction]);

  const createBucket = useCallback(async (name: string, region?: string) => {
    const actionId = startAction(
      'Création de bucket',
      `Création du bucket "${name}"`,
      name
    );
    
    setIsLoading(true);
    try {
      const response = await apiService.createBucket(name, region);
      
      if (response.success) {
        completeAction(actionId, true, `Bucket "${name}" créé avec succès`);
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
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de création');
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le bucket",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchBuckets, toast, startAction, completeAction]);

  const deleteBucket = useCallback(async (name: string) => {
    const actionId = startAction(
      'Suppression de bucket',
      `Suppression du bucket "${name}"`,
      name
    );
    
    setIsLoading(true);
    try {
      const response = await apiService.deleteBucket(name);
      
      if (response.success) {
        completeAction(actionId, true, `Bucket "${name}" supprimé avec succès`);
        toast({
          title: "Succès",
          description: `Le bucket "${name}" a été supprimé avec succès`
        });
        
        await fetchBuckets();
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du bucket:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de suppression');
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le bucket",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchBuckets, toast, startAction, completeAction]);

  const fetchObjects = useCallback(async (bucket: string, path: string = '') => {
    const actionId = startAction(
      'Chargement des objets',
      `Chargement du contenu${path ? ` du dossier "${path}"` : ''}`,
      bucket
    );
    
    setIsLoading(true);
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
        completeAction(actionId, true, `${s3Objects.length} élément(s) chargé(s)`);
      } else {
        throw new Error(response.message || 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des objets:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de chargement');
      toast({
        title: "Erreur",
        description: "Impossible de charger les objets",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [setObjects, toast, startAction, completeAction]);

  const uploadFile = useCallback(async (file: File, bucket: string, path: string = '') => {
    const actionId = startAction(
      'Upload de fichier',
      `Upload de "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)`,
      bucket,
      file.name
    );
    
    setIsLoading(true);
    try {
      const response = await apiService.uploadFile(file, bucket, path);
      
      if (response.success) {
        completeAction(actionId, true, `Fichier "${file.name}" uploadé avec succès`);
        toast({
          title: "Succès",
          description: `Le fichier "${file.name}" a été uploadé avec succès`
        });
        
        await fetchObjects(bucket, path);
      } else {
        throw new Error(response.message || 'Erreur lors de l\'upload du fichier');
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur d\'upload');
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'uploader le fichier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast, startAction, completeAction]);

  const deleteObject = useCallback(async (bucket: string, objectKey: string) => {
    const isFolder = objectKey.endsWith('/');
    const actionId = startAction(
      `Suppression ${isFolder ? 'de dossier' : 'de fichier'}`,
      `Suppression de "${objectKey}"${isFolder ? ' et de son contenu' : ''}`,
      bucket,
      objectKey
    );
    
    setIsLoading(true);
    try {
      const response = await apiService.deleteObject(bucket, objectKey);
      
      if (response.success) {
        completeAction(actionId, true, `${isFolder ? 'Dossier' : 'Fichier'} "${objectKey}" supprimé avec succès`);
        toast({
          title: "Succès",
          description: `${isFolder ? 'Le dossier' : 'Le fichier'} a été supprimé avec succès`
        });
        
        await fetchObjects(bucket);
      } else {
        throw new Error(response.message || 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de suppression');
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'élément",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast, startAction, completeAction]);

  const downloadObject = useCallback(async (bucket: string, objectKey: string) => {
    addLog({
      level: 'info',
      action: 'Téléchargement',
      details: `Génération du lien de téléchargement pour "${objectKey}"`,
      bucket,
      object: objectKey
    });
    
    try {
      const response = await apiService.getDownloadUrl(bucket, objectKey);
      
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
        addLog({
          level: 'success',
          action: 'Téléchargement',
          details: `Lien généré pour "${objectKey}"`,
          bucket,
          object: objectKey
        });
      } else {
        throw new Error(response.message || 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      addLog({
        level: 'error',
        action: 'Téléchargement',
        details: error instanceof Error ? error.message : 'Erreur de téléchargement',
        bucket,
        object: objectKey
      });
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'objet",
        variant: "destructive"
      });
    }
  }, [toast, addLog]);

  const createFolder = useCallback(async (bucket: string, path: string, folderName: string) => {
    const actionId = startAction(
      'Création de dossier',
      `Création du dossier "${folderName}"${path ? ` dans "${path}"` : ''}`,
      bucket,
      folderName
    );
    
    setIsLoading(true);
    try {
      const response = await apiService.createFolder(bucket, path, folderName);
      
      if (response.success) {
        completeAction(actionId, true, `Dossier "${folderName}" créé avec succès`);
        toast({
          title: "Succès",
          description: `Le dossier "${folderName}" a été créé avec succès`
        });
        
        await fetchObjects(bucket, path);
      } else {
        throw new Error(response.message || 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
      completeAction(actionId, false, error instanceof Error ? error.message : 'Erreur de création');
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le dossier",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [fetchObjects, toast, startAction, completeAction]);

  const logout = useCallback(async () => {
    const actionId = startAction('Déconnexion', 'Fermeture de la session');
    
    try {
      await apiService.logout();
      setCredentials(null);
      setBuckets([]);
      setObjects([]);
      setCurrentBucket(null);
      
      completeAction(actionId, true, 'Déconnexion réussie');
      toast({
        title: "Déconnexion",
        description: "Vous avez été déconnecté avec succès"
      });
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
      completeAction(actionId, false, 'Erreur lors de la déconnexion');
      // Even if logout fails on server, clear local state
      setCredentials(null);
      setBuckets([]);
      setObjects([]);
      setCurrentBucket(null);
    }
  }, [setCredentials, setBuckets, setObjects, setCurrentBucket, toast, startAction, completeAction]);

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
