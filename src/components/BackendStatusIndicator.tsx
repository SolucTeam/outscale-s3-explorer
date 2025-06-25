
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Check, AlertTriangle, X, RefreshCw } from 'lucide-react';
import { BackendStatus } from '../services/backendStatusService';

interface BackendStatusIndicatorProps {
  status: BackendStatus;
  isChecking: boolean;
  onRetry?: () => void;
  className?: string;
}

export const BackendStatusIndicator: React.FC<BackendStatusIndicatorProps> = ({
  status,
  isChecking,
  onRetry,
  className = ''
}) => {
  const getIcon = () => {
    if (isChecking) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    switch (status.variant) {
      case 'success':
        return <Check className="h-4 w-4" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
        return <X className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertVariant = () => {
    return status.variant === 'error' ? 'destructive' : 'default';
  };

  const getStatusColor = () => {
    switch (status.variant) {
      case 'success':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={className}>
      <Alert variant={getAlertVariant()}>
        <div className={getStatusColor()}>
          {getIcon()}
        </div>
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span className={`font-medium ${getStatusColor()}`}>
              {status.message}
            </span>
            {!status.isOnline && onRetry && !isChecking && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={onRetry}
                className="ml-2"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Vérifier
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
