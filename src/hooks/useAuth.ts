
import { useState, useEffect, useCallback } from 'react';
import { S3Credentials } from '../types/s3';
import { AuthService, StorageType } from '../services/authService';
import { OutscaleConfig } from '../services/outscaleConfig';
import { useToast } from '@/hooks/use-toast';

export const useAuth = (storageType: StorageType = 'localStorage') => {
  const [credentials, setCredentials] = useState<S3Credentials | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const authService = AuthService.getInstance();

  // Charger les credentials au montage
  useEffect(() => {
    const loadCredentials = () => {
      const storedCredentials = authService.getCredentials(storageType);
      if (storedCredentials && authService.validateCredentials(storedCredentials)) {
        setCredentials(storedCredentials);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };

    loadCredentials();
  }, [storageType]);

  /**
   * Connecter l'utilisateur avec des credentials
   */
  const login = useCallback(async (newCredentials: S3Credentials): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Valider les credentials
      if (!authService.validateCredentials(newCredentials)) {
        toast({
          title: "Erreur",
          description: "Credentials invalides",
          variant: "destructive"
        });
        return false;
      }

      // Valider la région
      if (!OutscaleConfig.isValidRegion(newCredentials.region)) {
        toast({
          title: "Erreur",
          description: "Région non supportée",
          variant: "destructive"
        });
        return false;
      }

      // Sauvegarder les credentials
      authService.saveCredentials(newCredentials, storageType);
      setCredentials(newCredentials);
      setIsAuthenticated(true);

      toast({
        title: "Succès",
        description: "Connexion réussie",
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la connexion",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [storageType, toast]);

  /**
   * Déconnecter l'utilisateur
   */
  const logout = useCallback(() => {
    authService.clearCredentials(storageType);
    setCredentials(null);
    setIsAuthenticated(false);

    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
  }, [storageType, toast]);

  /**
   * Changer le type de stockage
   */
  const changeStorageType = useCallback((newStorageType: StorageType) => {
    if (credentials) {
      // Sauvegarder dans le nouveau stockage
      authService.saveCredentials(credentials, newStorageType);
      // Supprimer de l'ancien stockage
      authService.clearCredentials(storageType);
    }
  }, [credentials, storageType]);

  /**
   * Mettre à jour les credentials
   */
  const updateCredentials = useCallback((newCredentials: S3Credentials) => {
    if (authService.validateCredentials(newCredentials)) {
      authService.saveCredentials(newCredentials, storageType);
      setCredentials(newCredentials);
    }
  }, [storageType]);

  return {
    credentials,
    isAuthenticated,
    isLoading,
    login,
    logout,
    changeStorageType,
    updateCredentials,
    hasCredentials: authService.hasCredentials(storageType)
  };
};
