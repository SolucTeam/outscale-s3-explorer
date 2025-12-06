
import React, { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, CheckCircle, Clock, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useOperationProgress } from '../hooks/useOperationProgress';
import { useActiveOperationsStore } from '../stores/activeOperationsStore';
import { useActionHistoryStore } from '../stores/actionHistoryStore';
import { toast } from 'sonner';

export const OperationStatusIndicator: React.FC = () => {
  const { activeOperations, hasActiveOperations, operationCount } = useOperationProgress();
  const { cancelOperation, isOperationActive } = useActiveOperationsStore();
  const { updateEntry } = useActionHistoryStore();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleCancelOperation = (operationId: string, operationMessage: string) => {
    // Essayer d'annuler via activeOperationsStore si l'opération y est enregistrée
    if (isOperationActive(operationId)) {
      cancelOperation(operationId);
    }
    
    // Toujours mettre à jour l'historique des actions
    updateEntry(operationId, { 
      status: 'error', 
      userFriendlyMessage: 'Opération annulée par l\'utilisateur',
      logLevel: 'warning'
    });
    toast.warning(`Annulation: ${operationMessage}`);
  };

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
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-800">
              {operationCount} opération{operationCount > 1 ? 's' : ''} en cours
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? 'Masquer les détails' : 'Afficher les détails'}
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-blue-600" />
                )}
              </Button>
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                Actif
              </Badge>
            </div>
          </div>
        </AlertDescription>
      </Alert>

      {isExpanded && (
        <div className="space-y-2">
          {activeOperations.map((operation) => (
            <div
              key={operation.id}
              className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <Loader2 className="w-4 h-4 text-blue-500 animate-spin flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {operation.message}
                  </span>
                </div>
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatDistanceToNow(operation.startTime, { 
                        addSuffix: true, 
                        locale: fr 
                      })}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-red-100 hover:text-red-600"
                    onClick={() => handleCancelOperation(operation.id, operation.message)}
                    title="Annuler l'opération"
                  >
                    <X className="w-4 h-4" />
                  </Button>
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
      )}
    </div>
  );
};
