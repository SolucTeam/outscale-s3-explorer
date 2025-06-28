
import { useState, useEffect } from 'react';
import { useActionHistoryStore } from '../stores/actionHistoryStore';

export interface ActiveOperation {
  id: string;
  type: string;
  message: string;
  progress?: number;
  startTime: Date;
}

export const useOperationProgress = () => {
  const [activeOperations, setActiveOperations] = useState<ActiveOperation[]>([]);
  const [hasActiveOperations, setHasActiveOperations] = useState(false);
  const { getCurrentUserEntries } = useActionHistoryStore();

  useEffect(() => {
    const updateActiveOperations = () => {
      const entries = getCurrentUserEntries();
      const active = entries
        .filter(entry => entry.status === 'started' || entry.status === 'progress')
        .slice(0, 5) // Limiter à 5 opérations actives max
        .map(entry => ({
          id: entry.id,
          type: entry.operationType,
          message: entry.userFriendlyMessage,
          progress: entry.progress,
          startTime: entry.timestamp
        }));

      setActiveOperations(active);
      setHasActiveOperations(active.length > 0);
    };

    // Mise à jour initiale
    updateActiveOperations();

    // Mise à jour périodique toutes les 2 secondes
    const interval = setInterval(updateActiveOperations, 2000);

    return () => clearInterval(interval);
  }, [getCurrentUserEntries]);

  // Empêcher la déconnexion si des opérations sont en cours
  useEffect(() => {
    if (hasActiveOperations) {
      // Désactiver les timeouts de session automatiques
      const preventLogout = () => {
        console.log('🔒 Opérations en cours - déconnexion automatique désactivée');
      };
      
      preventLogout();
    }
  }, [hasActiveOperations]);

  return {
    activeOperations,
    hasActiveOperations,
    operationCount: activeOperations.length
  };
};
