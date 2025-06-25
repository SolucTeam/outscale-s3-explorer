
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthTokenService } from '../services/authTokenService';
import { apiService } from '../services/apiService';
import { useS3Store } from './useS3Store';
import { useToast } from '@/hooks/use-toast';

export const useAuthGuard = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useS3Store();
  const { toast } = useToast();
  const authTokenService = AuthTokenService.getInstance();

  const handleTokenExpiration = () => {
    authTokenService.removeToken();
    logout();
    setIsAuthenticated(false);
    toast({
      title: "Session expirée",
      description: "Votre session a expiré. Veuillez vous reconnecter.",
      variant: "destructive"
    });
    navigate('/login', { replace: true });
  };

  const refreshTokenIfNeeded = async () => {
    if (authTokenService.isTokenExpiringSoon()) {
      try {
        const response = await apiService.refreshToken();
        if (response.success && response.data?.token) {
          authTokenService.setToken(response.data.token);
          console.log('Token refreshed successfully');
        } else {
          throw new Error('Failed to refresh token');
        }
      } catch (error) {
        console.error('Token refresh failed:', error);
        handleTokenExpiration();
      }
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const token = authTokenService.getToken();
      
      if (!token) {
        setIsAuthenticated(false);
        setIsLoading(false);
        if (location.pathname !== '/login') {
          navigate('/login', { replace: true });
        }
        return;
      }

      if (!authTokenService.isTokenValid()) {
        handleTokenExpiration();
        setIsLoading(false);
        return;
      }

      // Refresh token if needed
      await refreshTokenIfNeeded();
      
      setIsAuthenticated(true);
      setIsLoading(false);
    };

    checkAuth();

    // Set up periodic token check
    const interval = setInterval(async () => {
      if (authTokenService.isTokenValid()) {
        await refreshTokenIfNeeded();
      } else {
        handleTokenExpiration();
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [location.pathname]);

  return {
    isAuthenticated,
    isLoading,
    refreshTokenIfNeeded
  };
};
