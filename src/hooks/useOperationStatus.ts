
import { useState, useEffect, useCallback } from 'react';
import { apiService } from '../services/apiService';

interface OperationStatus {
  activeOperations: number;
  lastActivity: number;
  sessionValid: boolean;
}

export const useOperationStatus = () => {
  const [status, setStatus] = useState<OperationStatus>({
    activeOperations: 0,
    lastActivity: Date.now(),
    sessionValid: true
  });
  const [isLoading, setIsLoading] = useState(false);

  const fetchOperationStatus = useCallback(async () => {
    if (!apiService.isAuthenticated()) return;

    try {
      const response = await fetch(`${apiService['baseUrl']}/auth/operations/status`, {
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus(data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching operation status:', error);
    }
  }, []);

  const startOperation = useCallback(async () => {
    if (!apiService.isAuthenticated()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${apiService['baseUrl']}/auth/operation/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus(prev => ({
            ...prev,
            activeOperations: data.activeOperations,
            lastActivity: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error starting operation:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const endOperation = useCallback(async () => {
    if (!apiService.isAuthenticated()) return;

    try {
      const response = await fetch(`${apiService['baseUrl']}/auth/operation/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStatus(prev => ({
            ...prev,
            activeOperations: data.activeOperations,
            lastActivity: Date.now()
          }));
        }
      }
    } catch (error) {
      console.error('Error ending operation:', error);
    }
  }, []);

  // Polling pour mettre à jour le statut
  useEffect(() => {
    const interval = setInterval(fetchOperationStatus, 5000); // Toutes les 5 secondes
    fetchOperationStatus(); // Appel initial

    return () => clearInterval(interval);
  }, [fetchOperationStatus]);

  return {
    status,
    isLoading,
    startOperation,
    endOperation,
    refreshStatus: fetchOperationStatus
  };
};
