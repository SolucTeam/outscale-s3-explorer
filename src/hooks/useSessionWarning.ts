/**
 * Hook pour gérer l'avertissement d'expiration de session
 */

import { useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { EncryptionService } from '../services/encryptionService';

export const useSessionWarning = () => {
  const { toast } = useToast();

  useEffect(() => {
    // Démarrer le timer d'avertissement d'expiration
    const cleanup = EncryptionService.startExpirationWarning(toast);

    // Nettoyer lors du démontage
    return cleanup;
  }, [toast]);
};
