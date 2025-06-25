
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../contexts/AuthContext';

interface LocationState {
  from?: {
    pathname: string;
  };
}

export const LoginPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const state = location.state as LocationState;

  // Si déjà authentifié, rediriger vers la page demandée ou dashboard
  if (isAuthenticated) {
    const from = state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  return <LoginForm />;
};
