
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Cloud, LogOut, ArrowLeft } from 'lucide-react';

export const Header = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackToBuckets = () => {
    navigate('/dashboard');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isOnBucketPage = location.pathname.startsWith('/bucket/');

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">NumS3 Console</h1>
                <p className="text-sm text-gray-600">
                  {user?.region} • {user?.accessKey}
                </p>
              </div>
            </div>
            
            {isOnBucketPage && (
              <>
                <div className="h-6 w-px bg-gray-300" />
                <Button
                  onClick={handleBackToBuckets}
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-700"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour aux buckets
                </Button>
              </>
            )}
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Déconnexion
          </Button>
        </div>
      </div>
    </header>
  );
};
