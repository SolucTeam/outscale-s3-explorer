import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Cloud, LogOut, ArrowLeft, User, Settings, KeyRound, MapPin } from 'lucide-react';

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

  // Get user initials from access key (first 2 chars)
  const getUserInitials = () => {
    if (credentials?.accessKey) {
      return credentials.accessKey.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  // Get region display name
  const getRegionDisplay = () => {
    const regionMap: Record<string, string> = {
      'eu-west-2': 'Paris',
      'us-east-2': 'Ohio',
      'us-west-1': 'Californie',
      'ap-northeast-1': 'Tokyo',
      'cloudgouv-eu-west-1': 'Cloud Gouv',
    };
    return regionMap[credentials?.region || ''] || credentials?.region || 'Inconnu';
  };

  return (
    <header className="bg-card border-b border-border shadow-sm">
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
                  {getRegionDisplay()} • {credentials?.accessKey?.substring(0, 8)}...
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
          
          {/* User Menu Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10 border-2 border-primary/20 hover:border-primary/50 transition-colors">
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64 bg-popover border border-border shadow-lg z-50" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium leading-none">Compte S3</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <KeyRound className="w-3 h-3" />
                    <span className="font-mono">{credentials?.accessKey}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{getRegionDisplay()} ({credentials?.region})</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => navigate('/dashboard')}
                className="cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Tableau de bord
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => {
                  // Dispatch custom event to open widget settings
                  window.dispatchEvent(new CustomEvent('open-dashboard-settings'));
                }}
                className="cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" />
                Personnaliser le dashboard
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
