
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, AlertCircle, XCircle, Activity } from 'lucide-react';
import { BackendStatus } from '../services/backendStatusService';
import { useOperationStatus } from '../hooks/useOperationStatus';

interface BackendStatusIndicatorProps {
  status: BackendStatus;
  isChecking: boolean;
  onRetry: () => void;
}

export const BackendStatusIndicator: React.FC<BackendStatusIndicatorProps> = ({
  status,
  isChecking,
  onRetry
}) => {
  const { status: operationStatus } = useOperationStatus();

  const getStatusIcon = () => {
    if (operationStatus.activeOperations > 0) {
      return <Activity className="w-5 h-5 text-blue-600 animate-pulse" />;
    }
    
    switch (status.variant) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = () => {
    if (operationStatus.activeOperations > 0) {
      return 'bg-blue-50 border-blue-200';
    }
    
    switch (status.variant) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getPrimaryMessage = () => {
    if (operationStatus.activeOperations > 0) {
      return `${operationStatus.activeOperations} opération${operationStatus.activeOperations > 1 ? 's' : ''} en cours...`;
    }
    return status.message;
  };

  return (
    <Card className={`${getStatusColor()} transition-all duration-200`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium text-gray-900">
                {getPrimaryMessage()}
              </p>
              {operationStatus.activeOperations > 0 && (
                <p className="text-xs text-gray-600 mt-1">
                  Backend connecté - Opérations S3 en cours
                </p>
              )}
              {operationStatus.activeOperations === 0 && status.variant === 'success' && (
                <p className="text-xs text-green-700 mt-1">
                  Dernière activité : {new Date(operationStatus.lastActivity).toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {operationStatus.activeOperations > 0 && (
              <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                <Activity className="w-3 h-3 mr-1" />
                {operationStatus.activeOperations}
              </Badge>
            )}
            
            {!status.isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isChecking}
                className="text-xs"
              >
                {isChecking ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  'Reconnecter'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
