import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useS3Store } from '../hooks/useS3Store';

const Index = () => {
  const { isAuthenticated, checkSessionValidity } = useS3Store();
  const navigate = useNavigate();

  useEffect(() => {
    // Vérifier la validité de la session au chargement
    const sessionValid = checkSessionValidity();
    
    console.log('Index page - checking auth status:', { 
      isAuthenticated, 
      sessionValid 
    });

    if (isAuthenticated && sessionValid) {
      console.log('User authenticated and session valid, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    } else {
      console.log('User not authenticated or session invalid, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, checkSessionValidity, navigate]);

  // Afficher un loader pendant la vérification
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Vérification de la session...</p>
      </div>
    </div>
  );
};

export default Index;