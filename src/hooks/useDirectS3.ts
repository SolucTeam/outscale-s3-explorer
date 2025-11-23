import { useState, useCallback } from 'react';
import { directS3Service, DirectS3Response } from '../services/directS3Service';
import { useS3Store } from './useS3Store';
import { S3Bucket, S3Object, S3Credentials } from '../types/s3';
import { useToast } from '@/hooks/use-toast';
import { ErrorService } from '@/services/errorService';

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

  /**
   * Gestion des erreurs avec le nouveau ErrorService
   */
  const handleError = (response: DirectS3Response<unknown>, defaultMessage: string): boolean => {
    // Créer un objet erreur pour ErrorService
    const error = {
      response: {
        status: 500,
        data: {
          error: response.error,
          message: response.message,
          code: response.error
        }
      },
      message: response.message || defaultMessage
    };

    const appError = ErrorService.parseError(error);
    
    // Logger l'erreur
    console.error('❌ Erreur:', {
      code: appError.code,
      message: appError.message,
      userMessage: appError.userMessage,
      canRetry: appError.canRetry,
      action: appError.action
    });

    // Mettre à jour le store
    setError(appError.userMessage);

    // Afficher le toast avec le message utilisateur
    toast({
      title: "Erreur",
      description: ErrorService.getUserMessage(appError),
      variant: "destructive",
      duration: appError.canRetry ? 5000 : 7000
    });

    // Si erreur d'authentification, déconnecter
    if (ErrorService.isAuthError(appError)) {
      console.warn('🔐 Erreur d\'authentification détectée, déconnexion...');
      setTimeout(() => {
        logout();
      }, 2000);
    }

    return false;
  };

  /**
   * Initialisation avec gestion d'erreur améliorée
   */
  const initialize = useCallback(async (credentials: S3Credentials): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.initialize(credentials);
      
      if (response.success) {
        setInitialized(true);
        console.log('✅ S3 initialisé avec succès');
        return true;
      } else {
        return handleError(response, 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      console.error('❌ Initialize error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur de connexion",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Récupération des buckets
   */
  const fetchBuckets = useCallback(async (forceRefresh: boolean = false): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.getBuckets();
      
      if (response.success && response.data) {
        setBuckets(response.data);
        console.log(`✅ ${response.data.length} buckets chargés`);
        return true;
      } else {
        return handleError(response, 'Erreur lors du chargement des buckets');
      }
    } catch (error) {
      console.error('❌ Fetch buckets error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  /**
   * Création de bucket
   */
  const createBucket = useCallback(async (
    name: string, 
    region: string,
    options?: {
      objectLockEnabled?: boolean;
      versioningEnabled?: boolean;
      encryptionEnabled?: boolean;
    }
  ): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.createBucket(name, options);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" créé avec succès`,
          duration: 3000
        });
        
        // Rafraîchir la liste des buckets
        await fetchBuckets(true);
        return true;
      } else {
        return handleError(response, 'Erreur lors de la création du bucket');
      }
    } catch (error) {
      console.error('❌ Create bucket error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, fetchBuckets]);

  /**
   * Suppression de bucket
   */
  const deleteBucket = useCallback(async (name: string): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.deleteBucket(name);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Bucket "${name}" supprimé avec succès`,
          duration: 3000
        });
        
        // Rafraîchir la liste des buckets
        await fetchBuckets(true);
        return true;
      } else {
        return handleError(response, 'Erreur lors de la suppression du bucket');
      }
    } catch (error) {
      console.error('❌ Delete bucket error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized, fetchBuckets]);

  /**
   * Récupération des objets
   */
  const fetchObjects = useCallback(async (bucket: string, path: string = ''): Promise<boolean> => {
    if (!initialized) return false;
    
    setLoading(true);
    setError(null);

    try {
      const response = await directS3Service.getObjects(bucket, path);
      
      if (response.success && response.data) {
        setObjects(response.data);
        console.log(`✅ ${response.data.length} objets chargés pour ${bucket}/${path}`);
        return true;
      } else {
        return handleError(response, 'Erreur lors du chargement des objets');
      }
    } catch (error) {
      console.error('❌ Fetch objects error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    } finally {
      setLoading(false);
    }
  }, [initialized]);

  /**
   * Upload de fichier
   */
  const uploadFile = useCallback(async (file: File, bucket: string, path: string = ''): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await directS3Service.uploadFile(file, bucket, path);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Fichier "${file.name}" uploadé avec succès`,
          duration: 3000
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de l\'upload');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur d'upload",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    }
  }, [initialized]);

  /**
   * Suppression d'objet
   */
  const deleteObject = useCallback(async (bucket: string, objectKey: string): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await directS3Service.deleteObject(bucket, objectKey);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: "Objet supprimé avec succès",
          duration: 3000
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('❌ Delete object error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    }
  }, [initialized]);

  /**
   * Téléchargement d'objet
   */
  const downloadObject = useCallback(async (bucket: string, objectKey: string): Promise<void> => {
    if (!initialized) return;

    try {
      const response = await directS3Service.getDownloadUrl(bucket, objectKey);
      
      if (response.success && response.data?.url) {
        window.open(response.data.url, '_blank');
        toast({
          title: "Succès",
          description: "Téléchargement démarré",
          duration: 2000
        });
      } else {
        handleError(response, 'Erreur lors de la génération du lien de téléchargement');
      }
    } catch (error) {
      console.error('❌ Download error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
    }
  }, [initialized]);

  /**
   * Création de dossier
   */
  const createFolder = useCallback(async (bucket: string, path: string, folderName: string): Promise<boolean> => {
    if (!initialized) return false;

    try {
      const response = await directS3Service.createFolder(bucket, path, folderName);
      
      if (response.success) {
        toast({
          title: "Succès",
          description: `Dossier "${folderName}" créé avec succès`,
          duration: 3000
        });
        return true;
      } else {
        return handleError(response, 'Erreur lors de la création du dossier');
      }
    } catch (error) {
      console.error('❌ Create folder error:', error);
      const appError = ErrorService.parseError(error);
      setError(appError.userMessage);
      
      toast({
        title: "Erreur",
        description: ErrorService.getUserMessage(appError),
        variant: "destructive"
      });
      
      return false;
    }
  }, [initialized]);

  /**
   * Déconnexion
   */
  const logout = useCallback((): void => {
    setInitialized(false);
    storeLogout();
    console.log('👋 Déconnexion');
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