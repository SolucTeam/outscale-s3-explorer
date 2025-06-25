
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { jwtAuthService } from '../services/jwtAuthService';
import { NavigationManager } from '../services/navigationManager';

export const Login: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Si déjà connecté, rediriger
    const checkExistingAuth = async () => {
      const isValid = await jwtAuthService.isTokenValid();
      if (isValid) {
        const redirectPath = NavigationManager.getRedirectAfterLogin() || '/dashboard';
        navigate(redirectPath, { replace: true });
      }
    };

    checkExistingAuth();
  }, [navigate]);

  const handleLoginSuccess = () => {
    const redirectPath = NavigationManager.getRedirectAfterLogin() || '/dashboard';
    navigate(redirectPath, { replace: true });
  };

  return (
    <div className="min-h-screen">
      <LoginForm onLoginSuccess={handleLoginSuccess} />
    </div>
  );
};
