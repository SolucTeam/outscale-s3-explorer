
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActionHistoryStore } from '../stores/actionHistoryStore';
import { useS3Store } from '../hooks/useS3Store';
import { Activity, Clock, CheckCircle, XCircle, AlertCircle, Filter, Trash2, User, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ActionHistory = () => {
  const { credentials } = useS3Store();
  const { 
    getCurrentUserEntries, 
    clearHistory, 
    setCurrentUser, 
    currentUserId,
    userHistories,
    toggleLogging
  } = useActionHistoryStore();
  
  const [filter, setFilter] = useState<'all' | 'success' | 'error' | 'info'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Mettre à jour l'utilisateur courant quand les credentials changent
  useEffect(() => {
    if (credentials) {
      const userId = `${credentials.accessKey.substring(0, 8)}_${credentials.region}`;
      setCurrentUser(userId);
    }
  }, [credentials, setCurrentUser]);

  const entries = getCurrentUserEntries();
  const currentUserHistory = currentUserId && userHistories[currentUserId];
  const isLoggingEnabled = currentUserHistory?.isLoggingEnabled ?? true;

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
        return 'bg-green-50 text-green-700 border-green-200';
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'started':
      case 'progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getCurrentUserDisplay = () => {
    if (!credentials) return 'Aucun compte';
    return `${credentials.accessKey.substring(0, 8)}... (${credentials.region})`;
  };

  return (
    <Card className="h-fit shadow-sm border-gray-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-blue-100 rounded-lg">
              <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base text-gray-900">Historique des actions</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <User className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-600">{getCurrentUserDisplay()}</span>
                <Badge variant="secondary" className="text-xs h-5">
                  {entries.length}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
            >
              <Settings className="w-3 h-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="xl:hidden h-8 w-8 p-0 text-gray-600 hover:text-gray-900"
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
        
        {/* Paramètres */}
        {showSettings && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Enregistrement automatique</span>
              <Button
                variant={isLoggingEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleLogging}
                className="h-7 text-xs"
              >
                {isLoggingEnabled ? 'Activé' : 'Désactivé'}
              </Button>
            </div>
          </div>
        )}
        
        {/* Filtres */}
        <div className={`flex flex-wrap gap-1 mt-2 ${isExpanded ? 'block' : 'hidden xl:flex'}`}>
          {['all', 'success', 'error', 'info'].map((status) => (
            <Button
              key={status}
              variant={filter === status ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(status as any)}
              className="text-xs h-7 border-gray-300"
            >
              {status === 'all' ? 'Toutes' : 
               status === 'success' ? 'Succès' :
               status === 'error' ? 'Erreurs' : 'En cours'}
            </Button>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {filteredActions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Aucune action enregistrée</p>
            <p className="text-xs text-gray-500">Les actions S3 apparaîtront ici</p>
          </div>
        ) : (
          <ScrollArea className="h-64 xl:h-96">
            <div className="p-4 space-y-3">
              {filteredActions.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`group relative p-3 rounded-lg border transition-all duration-200 hover:shadow-sm ${
                    index === 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="flex-shrink-0">
                        {getStatusIcon(entry.status)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {entry.userFriendlyMessage}
                        </p>
                        {(entry.bucketName || entry.objectName) && (
                          <div className="flex items-center space-x-2 mt-1 text-xs text-gray-600">
                            {entry.bucketName && (
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                                📦 {entry.bucketName}
                              </span>
                            )}
                            {entry.objectName && (
                              <span className="px-2 py-1 bg-gray-100 rounded text-xs truncate max-w-32">
                                📄 {entry.objectName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-xs flex-shrink-0 border ${getStatusColor(entry.status)}`}
                    >
                      {entry.status === 'success' ? 'Réussi' :
                       entry.status === 'error' ? 'Échec' :
                       entry.status === 'started' ? 'Démarré' :
                       entry.status === 'progress' ? 'En cours' : entry.status}
                    </Badge>
                  </div>
                  
                  {entry.details && (
                    <p className="text-xs text-gray-600 mt-2 pl-7 truncate bg-gray-50 p-2 rounded">
                      {entry.details}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between mt-2 pl-7">
                    <p className="text-xs text-gray-500">
                      {formatDistanceToNow(entry.timestamp, { addSuffix: true, locale: fr })}
                    </p>
                    {entry.progress !== undefined && (
                      <div className="text-xs text-blue-600 font-medium">
                        {entry.progress}%
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
