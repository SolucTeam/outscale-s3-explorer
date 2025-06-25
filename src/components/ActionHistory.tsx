
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActionHistoryStore } from '../stores/actionHistoryStore';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, Filter, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ActionHistory = () => {
  const { entries, clearHistory } = useActionHistoryStore();
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredActions = entries.filter(entry => {
    if (filter === 'all') return true;
    if (filter === 'success') return entry.status === 'success';
    if (filter === 'error') return entry.status === 'error';
    if (filter === 'info') return entry.status === 'started' || entry.status === 'progress';
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />;
      case 'error':
        return <XCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />;
      case 'started':
      case 'progress':
        return <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />;
      default:
        return <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      case 'started':
      case 'progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            <CardTitle className="text-sm sm:text-base">Historique des actions</CardTitle>
            <Badge variant="secondary" className="text-xs">
              {entries.length}
            </Badge>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="xl:hidden h-8 w-8 p-0"
            >
              <Filter className="w-3 h-3" />
            </Button>
            {entries.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearHistory}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Filtres - visibles sur desktop ou quand expanded sur mobile */}
        <div className={`flex flex-wrap gap-1 ${isExpanded ? 'block' : 'hidden xl:flex'}`}>
          {['all', 'success', 'error', 'info'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status as any)}
              className="text-xs h-7"
            >
              {status === 'all' ? 'Toutes' : 
               status === 'success' ? 'Succès' :
               status === 'error' ? 'Erreurs' : 'Infos'}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredActions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            <Clock className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p>Aucune action enregistrée</p>
          </div>
        ) : (
          <ScrollArea className="h-64 xl:h-96">
            <div className="p-4 space-y-3">
              {filteredActions.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-gray-200 pl-3 pb-3 last:pb-0"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      {getStatusIcon(entry.status)}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          {entry.userFriendlyMessage}
                        </p>
                        {(entry.bucketName || entry.objectName) && (
                          <p className="text-xs text-gray-600 truncate">
                            {entry.bucketName && `Bucket: ${entry.bucketName}`}
                            {entry.bucketName && entry.objectName && ' - '}
                            {entry.objectName && `Objet: ${entry.objectName}`}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs flex-shrink-0 ${getStatusColor(entry.status)}`}
                    >
                      {entry.status}
                    </Badge>
                  </div>
                  
                  {entry.details && (
                    <p className="text-xs text-gray-600 mt-1 pl-5 truncate">
                      {entry.details}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1 pl-5">
                    {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: fr })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
