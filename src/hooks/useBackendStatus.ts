
import { useState, useEffect } from 'react';
import { backendStatusService, BackendStatus } from '../services/backendStatusService';

export const useBackendStatus = (checkInterval: number = 30000) => {
  const [status, setStatus] = useState<BackendStatus>({
    isOnline: false,
    message: 'Vérification du backend...',
    variant: 'warning'
  });
  const [isChecking, setIsChecking] = useState(true);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const newStatus = await backendStatusService.checkStatus();
      setStatus(newStatus);
    } catch (error) {
      setStatus({
        isOnline: false,
        message: 'Erreur lors de la vérification du backend',
        variant: 'error'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Vérification initiale
    checkStatus();

    // Vérification périodique
    const interval = setInterval(checkStatus, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  return {
    status,
    isChecking,
    checkStatus
  };
};
