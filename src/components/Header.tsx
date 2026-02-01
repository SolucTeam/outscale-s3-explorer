import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Cloud, LogOut, ArrowLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

export const Header = () => {
  const { credentials, currentBucket } = useS3Store();
  const { logout } = useEnhancedDirectS3();
  const navigate = useNavigate();

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-background border-b border-border shadow-sm">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Outscale S3 Explorer</h1>
                <p className="text-sm text-muted-foreground">
                  {credentials?.region} • {credentials?.accessKey}
                </p>
              </div>
            </div>
            
            {currentBucket && (
              <>
                <div className="h-6 w-px bg-border" />
                <Button
                  onClick={handleBackToDashboard}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Retour aux buckets
                </Button>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <ThemeToggle />
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
      </div>
    </header>
  );
};
