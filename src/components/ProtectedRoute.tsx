
import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { NavigationManager } from '../services/navigationManager';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (!isAuthenticated && !isLoading) {
      // Sauvegarder la route actuelle pour redirection après login
      if (location.pathname !== '/login') {
        NavigationManager.saveRedirectAfterLogin(location.pathname);
      }
      
      toast({
        title: "Session expirée",
        description: "Veuillez vous reconnecter pour continuer",
        variant: "destructive"
      });
    }
  }, [isAuthenticated, isLoading, location.pathname, toast]);

  // Affichage de chargement pendant la vérification
  if (isLoading) {
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
