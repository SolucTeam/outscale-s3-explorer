
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActivityLogs } from '../hooks/useActivityLogs';
import { History, Trash2, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ActionHistory = () => {
  const { actionHistory, clearHistory } = useActivityLogs();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(1)}s`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <CardTitle className="text-lg">Historique des actions</CardTitle>
            <Badge variant="secondary">{actionHistory.length}</Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearHistory}
            disabled={actionHistory.length === 0}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Vider
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-80 w-full">
          {actionHistory.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Aucune action pour le moment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {actionHistory.map((action) => (
                <div
                  key={action.id}
                  className="flex items-start space-x-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getStatusIcon(action.status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm text-gray-900">{action.action}</h4>
                      <div className="flex items-center space-x-2">
                        {action.duration && (
                          <span className="text-xs text-gray-500">
                            {formatDuration(action.duration)}
                          </span>
                        )}
                        <Badge className={getStatusColor(action.status)}>
                          {action.status === 'pending' ? 'En cours' : 
                           action.status === 'success' ? 'Succès' : 'Échec'}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{action.details}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {action.bucket && (
                          <Badge variant="outline" className="text-xs">
                            📦 {action.bucket}
                          </Badge>
                        )}
                        {action.object && (
                          <Badge variant="outline" className="text-xs">
                            📄 {action.object}
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(action.timestamp, { addSuffix: true, locale: fr })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
