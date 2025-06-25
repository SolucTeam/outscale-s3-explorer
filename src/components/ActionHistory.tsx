
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActionHistoryStore } from '../stores/actionHistoryStore';
import { History, Trash2, Filter, RefreshCw, Download, Upload, Folder, FolderMinus } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export const ActionHistory = () => {
  const { entries, clearHistory, isLoggingEnabled, toggleLogging } = useActionHistoryStore();
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'object_upload': return <Upload className="w-4 h-4" />;
      case 'object_download': return <Download className="w-4 h-4" />;
      case 'object_delete': return <Trash2 className="w-4 h-4" />;
      case 'folder_create': return <Folder className="w-4 h-4" />;
      case 'folder_delete': return <FolderMinus className="w-4 h-4" />;
      case 'bucket_create': return <Folder className="w-4 h-4" />;
      case 'bucket_delete': return <FolderMinus className="w-4 h-4" />;
      default: return <RefreshCw className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'progress': return 'bg-blue-100 text-blue-800';
      case 'started': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogLevelColor = (logLevel: string) => {
    switch (logLevel) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const filteredEntries = entries.filter(entry => {
    if (filterType !== 'all' && entry.operationType !== filterType) return false;
    if (filterStatus !== 'all' && entry.status !== filterStatus) return false;
    return true;
  });

  const operationTypes = [
    { value: 'all', label: 'Toutes les opérations' },
    { value: 'object_upload', label: 'Uploads' },
    { value: 'object_download', label: 'Téléchargements' },
    { value: 'object_delete', label: 'Suppressions d\'objets' },
    { value: 'folder_create', label: 'Créations de dossiers' },
    { value: 'folder_delete', label: 'Suppressions de dossiers' },
    { value: 'bucket_create', label: 'Créations de buckets' },
    { value: 'bucket_delete', label: 'Suppressions de buckets' }
  ];

  const statusTypes = [
    { value: 'all', label: 'Tous les statuts' },
    { value: 'started', label: 'Démarrées' },
    { value: 'progress', label: 'En cours' },
    { value: 'success', label: 'Réussies' },
    { value: 'error', label: 'Échouées' }
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5" />
            <CardTitle className="text-lg">Historique des actions</CardTitle>
            <Badge variant="secondary">{entries.length}</Badge>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant={isLoggingEnabled ? "default" : "outline"}
              onClick={toggleLogging}
            >
              {isLoggingEnabled ? '🟢 Actif' : '🔴 Inactif'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearHistory}
              disabled={entries.length === 0}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-2 mt-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-sm px-2 py-1 border rounded"
          >
            {operationTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm px-2 py-1 border rounded"
          >
            {statusTypes.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-64">
          {filteredEntries.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {entries.length === 0 ? (
                <>
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune action enregistrée</p>
                </>
              ) : (
                <p>Aucune action ne correspond aux filtres</p>
              )}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getOperationIcon(entry.operationType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge 
                        className={`text-xs ${getStatusColor(entry.status)}`}
                        variant="secondary"
                      >
                        {entry.status}
                      </Badge>
                      {entry.progress !== undefined && entry.progress > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {entry.progress}%
                        </Badge>
                      )}
                      <span className={`text-xs ${getLogLevelColor(entry.logLevel)}`}>
                        {entry.logLevel.toUpperCase()}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {entry.userFriendlyMessage}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                      <span>
                        {formatDistanceToNow(entry.timestamp, { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                      {entry.bucketName && (
                        <span>Bucket: {entry.bucketName}</span>
                      )}
                      {entry.objectName && (
                        <span className="truncate max-w-32">
                          Objet: {entry.objectName}
                        </span>
                      )}
                    </div>
                    
                    {entry.details && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {entry.details}
                      </p>
                    )}
                    
                    {entry.errorCode && (
                      <Badge variant="destructive" className="text-xs mt-1">
                        {entry.errorCode}
                      </Badge>
                    )}
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
