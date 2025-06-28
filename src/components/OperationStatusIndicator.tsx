
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useOperationProgress } from '../hooks/useOperationProgress';

export const OperationStatusIndicator: React.FC = () => {
  const { activeOperations, hasActiveOperations, operationCount } = useOperationProgress();

  if (!hasActiveOperations) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription>
          <div className="flex items-center justify-between">
            <span className="font-medium text-green-800">
              Système prêt - Aucune opération en cours
            </span>
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              Actif
            </Badge>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      <Alert className="border-blue-200 bg-blue-50">
        <Activity className="h-4 w-4 text-blue-600" />
        <AlertDescription>
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-blue-800">
              {operationCount} opération{operationCount > 1 ? 's' : ''} en cours
            </span>
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Actif
            </Badge>
          </div>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        {activeOperations.map((operation) => (
          <div
            key={operation.id}
            className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-sm font-medium text-gray-900">
                  {operation.message}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-500">
                <Clock className="w-3 h-3" />
                <span>
                  {formatDistanceToNow(operation.startTime, { 
                    addSuffix: true, 
                    locale: fr 
                  })}
                </span>
              </div>
            </div>
            
            {operation.progress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Progression</span>
                  <span>{operation.progress}%</span>
                </div>
                <Progress 
                  value={operation.progress} 
                  className="h-2"
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
