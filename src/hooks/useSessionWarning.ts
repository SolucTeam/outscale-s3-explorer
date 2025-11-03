/**
 * Hook pour gérer l'avertissement d'expiration de session
 */

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EncryptionService } from '../services/encryptionService';
import { useS3Store } from './useS3Store';

export const useSessionWarning = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useS3Store();

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('⏭️ Utilisateur non authentifié, pas de vérification de session');
      return;
    }

    // ✅ AJOUT : Vérification de l'existence d'une session active
    if (!EncryptionService.hasActiveSession()) {
      console.log('⏭️ Pas de session active, pas de vérification');
      return;
    }

    console.log('✅ Démarrage du timer d\'avertissement d\'expiration de session');
    
    const cleanup = EncryptionService.startExpirationWarning(toast);
    return cleanup;
  }, [toast, isAuthenticated]);
};