
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useS3Store } from '../hooks/useS3Store';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, checkSessionValidity } = useS3Store();
  const location = useLocation();

  // Vérifier la validité de la session dans useEffect pour éviter les setState pendant le rendu
  useEffect(() => {
    checkSessionValidity();
  }, [checkSessionValidity]);

  if (!isAuthenticated) {
    console.log('Protected route: redirecting to login', { 
      isAuthenticated, 
      currentPath: location.pathname 
    });
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
