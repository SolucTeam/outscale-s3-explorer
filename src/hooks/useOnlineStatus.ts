import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "✅ Connexion rétablie",
        description: "Vous êtes de nouveau en ligne",
        variant: "default",
      });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "⚠️ Connexion perdue",
        description: "Vous êtes hors ligne. Certaines fonctionnalités peuvent être indisponibles.",
        variant: "destructive",
        duration: 10000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return isOnline;
};
