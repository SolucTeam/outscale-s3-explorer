
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useS3Store } from '../hooks/useS3Store';

const Index = () => {
  const { isAuthenticated } = useS3Store();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default Index;
