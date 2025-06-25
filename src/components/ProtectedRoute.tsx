
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthGuard } from '../utils/authGuard';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authenticated = await AuthGuard.requireAuth(location.pathname);
        setIsAuthenticated(authenticated);
        
        if (!authenticated) {
          toast({
            title: "Session expirée",
            description: "Veuillez vous reconnecter pour continuer",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Protected route auth check failed:', error);
        setIsAuthenticated(false);
        
        toast({
          title: "Erreur d'authentification",
          description: "Une erreur s'est produite lors de la vérification",
          variant: "destructive"
        });
      }
    };

    checkAuth();
  }, [location.pathname, toast]);

  // Affichage de chargement pendant la vérification
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirection vers login si non authentifié
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Rendu du contenu protégé
  return <>{children}</>;
};
