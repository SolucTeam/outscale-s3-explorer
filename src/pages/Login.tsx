
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { NavigationManager } from '../services/navigationManager';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Si déjà connecté, rediriger
    if (isAuthenticated) {
      const redirectPath = NavigationManager.getRedirectAfterLogin() || '/dashboard';
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, isAuthenticated]);

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
