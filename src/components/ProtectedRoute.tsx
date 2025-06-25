
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2 text-blue-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Vérification de l'authentification...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Sauvegarder la page demandée pour redirection après login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
