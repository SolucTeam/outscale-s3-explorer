
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Terminal, Trash2, Pause, Play, Settings } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BackendLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  service: string;
  raw: string;
}

export const BackendConsole = () => {
  const [logs, setLogs] = useState<BackendLog[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [maxLogs, setMaxLogs] = useState(1000);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!isPaused) {
      connectToBackendLogs();
    } else {
      disconnectFromBackendLogs();
    }

    return () => {
      disconnectFromBackendLogs();
    };
  }, [isPaused]);

  const connectToBackendLogs = () => {
    try {
      const eventSource = new EventSource('http://localhost:5001/api/logs/stream');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('📡 Connexion aux logs backend établie');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const logData = JSON.parse(event.data);
          const newLog: BackendLog = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date(logData.timestamp || Date.now()),
            level: logData.level || 'info',
            message: logData.message || event.data,
            service: logData.service || 'nums3-backend',
            raw: event.data
          };

          setLogs(prevLogs => {
            const updatedLogs = [newLog, ...prevLogs];
            return updatedLogs.slice(0, maxLogs);
          });

          // Auto-scroll vers le bas si on n'est pas en pause
          setTimeout(() => {
            if (scrollAreaRef.current && !isPaused) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTop = 0;
              }
            }
          }, 100);
        } catch (error) {
          console.error('Erreur parsing log backend:', error);
        }
      };

      eventSource.onerror = () => {
        console.log('❌ Connexion aux logs backend interrompue');
        setIsConnected(false);
        
        // Tentative de reconnexion après 5 secondes
        setTimeout(() => {
          if (!isPaused && eventSourceRef.current?.readyState === EventSource.CLOSED) {
            connectToBackendLogs();
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Erreur connexion logs backend:', error);
      setIsConnected(false);
    }
  };

  const disconnectFromBackendLogs = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'info':
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <Card className="h-fit shadow-sm border-gray-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 bg-gray-800 rounded-lg">
              <Terminal className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-sm sm:text-base text-gray-900">Console Backend</CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Connecté' : 'Déconnecté'}
                </span>
                <Badge variant="secondary" className="text-xs h-5">
                  {logs.length}
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
              onClick={togglePause}
              className={`h-8 w-8 p-0 ${isPaused ? 'text-green-600 hover:text-green-700' : 'text-orange-600 hover:text-orange-700'}`}
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
            </Button>
            {logs.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearLogs}
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
              <span className="text-sm text-gray-700">Limite logs</span>
              <select 
                value={maxLogs} 
                onChange={(e) => setMaxLogs(Number(e.target.value))}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value={100}>100</option>
                <option value={500}>500</option>
                <option value={1000}>1000</option>
                <option value={2000}>2000</option>
              </select>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Terminal className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">Aucun log backend</p>
            <p className="text-xs text-gray-500">
              {isConnected ? 'En attente des logs du serveur...' : 'Connexion au serveur...'}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-64 xl:h-96" ref={scrollAreaRef}>
            <div className="p-2 space-y-1 font-mono text-xs">
              {logs.map((log, index) => (
                <div
                  key={log.id}
                  className={`group relative p-2 rounded border transition-all duration-200 hover:shadow-sm ${
                    index === 0 && !isPaused ? 'bg-green-50/30 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                      <span className="text-xs">{getLevelIcon(log.level)}</span>
                      <Badge
                        variant="secondary"
                        className={`text-xs flex-shrink-0 border ${getLevelColor(log.level)}`}
                      >
                        {log.level.toUpperCase()}
                      </Badge>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {log.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                  
                  <div className="mt-1 pl-6">
                    <p className="text-xs text-gray-800 break-all">
                      {log.message}
                    </p>
                    {log.service && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-600">
                        {log.service}
                      </span>
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
