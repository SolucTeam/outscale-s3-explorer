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

  // Vérifier l'expiration du token périodiquement
  useEffect(() => {
    const checkTokenExpiry = () => {
      if (isAuthenticated && authService.isTokenExpired()) {
        console.log('Token expiré, déconnexion automatique');
        logout();
        toast({
          title: "Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive"
        });
      }
    };

    // Vérifier toutes les 30 secondes
    const interval = setInterval(checkTokenExpiry, 30000);
    
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Charger les credentials au montage
  useEffect(() => {
    const loadCredentials = () => {
      const storedCredentials = authService.getCredentials(storageType);
      
      if (storedCredentials && authService.validateCredentials(storedCredentials)) {
        // Vérifier si la session est encore valide (non expirée)
        if (authService.isSessionValid(storageType)) {
          setCredentials(storedCredentials);
          setIsAuthenticated(true);
        } else {
          // Session expirée, nettoyer
          authService.clearCredentials(storageType);
          toast({
            title: "Session expirée",
            description: "Votre session a expiré. Veuillez vous reconnecter.",
            variant: "destructive"
          });
        }
      }
      setIsLoading(false);
    };

    loadCredentials();
  }, [storageType, toast]);

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

      // Sauvegarder les credentials avec expiration étendue
      authService.saveCredentials(newCredentials, storageType);
      setCredentials(newCredentials);
      setIsAuthenticated(true);

      const sessionDuration = storageType === 'localStorage' ? '4 heures' : 
                             storageType === 'sessionStorage' ? '2 heures' : 'cette session';

      toast({
        title: "Connexion réussie",
        description: `Session valide pendant ${sessionDuration}`,
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
    authService.clearAllCredentials();
    setCredentials(null);
    setIsAuthenticated(false);

    toast({
      title: "Déconnexion",
      description: "Vous avez été déconnecté avec succès",
    });
  }, [toast]);

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
    hasCredentials: authService.hasCredentials(storageType),
    isSessionValid: authService.isSessionValid(storageType)
  };
};
