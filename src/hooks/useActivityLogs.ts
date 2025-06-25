
import { useState, useEffect } from 'react';
import { logService, LogEntry, ActionHistoryEntry } from '../services/logService';

export const useActivityLogs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [actionHistory, setActionHistory] = useState<ActionHistoryEntry[]>([]);

  useEffect(() => {
    // Initialiser avec les logs existants
    setLogs(logService.getLogs());
    setActionHistory(logService.getActionHistory());

    // S'abonner aux changements
    const unsubscribeLogs = logService.onLogsChange(setLogs);
    const unsubscribeHistory = logService.onHistoryChange(setActionHistory);

    return () => {
      unsubscribeLogs();
      unsubscribeHistory();
    };
  }, []);

  const addLog = (entry: Omit<LogEntry, 'id' | 'timestamp'>) => {
    logService.addLog(entry);
  };

  const startAction = (action: string, details: string, bucket?: string, object?: string) => {
    return logService.startAction(action, details, bucket, object);
  };

  const completeAction = (actionId: string, success: boolean, details?: string) => {
    logService.completeAction(actionId, success, details);
  };

  const clearLogs = () => {
    logService.clearLogs();
  };

  const clearHistory = () => {
    logService.clearHistory();
  };

  return {
    logs,
    actionHistory,
    addLog,
    startAction,
    completeAction,
    clearLogs,
    clearHistory
  };
};
