
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  action: string;
  details?: string;
  bucket?: string;
  object?: string;
}

export interface ActionHistoryEntry {
  id: string;
  timestamp: Date;
  action: string;
  status: 'pending' | 'success' | 'error';
  details: string;
  bucket?: string;
  object?: string;
  duration?: number;
}

class LogService {
  private logs: LogEntry[] = [];
  private actionHistory: ActionHistoryEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];
  private historyListeners: ((history: ActionHistoryEntry[]) => void)[] = [];

  // Gestion des logs
  addLog(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    const newLog: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      timestamp: new Date()
    };
    
    this.logs.unshift(newLog);
    
    // Garder seulement les 100 derniers logs
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100);
    }
    
    this.notifyLogListeners();
    console.log(`[${entry.level.toUpperCase()}] ${entry.action}`, entry.details || '');
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
    this.notifyLogListeners();
  }

  // Gestion de l'historique des actions
  startAction(action: string, details: string, bucket?: string, object?: string): string {
    const actionId = Date.now().toString();
    const newAction: ActionHistoryEntry = {
      id: actionId,
      timestamp: new Date(),
      action,
      status: 'pending',
      details,
      bucket,
      object
    };
    
    this.actionHistory.unshift(newAction);
    this.notifyHistoryListeners();
    
    this.addLog({
      level: 'info',
      action: `Début: ${action}`,
      details,
      bucket,
      object
    });
    
    return actionId;
  }

  completeAction(actionId: string, success: boolean, details?: string) {
    const action = this.actionHistory.find(a => a.id === actionId);
    if (action) {
      action.status = success ? 'success' : 'error';
      action.duration = Date.now() - action.timestamp.getTime();
      if (details) {
        action.details = details;
      }
      
      this.notifyHistoryListeners();
      
      this.addLog({
        level: success ? 'success' : 'error',
        action: `${success ? 'Succès' : 'Échec'}: ${action.action}`,
        details: details || action.details,
        bucket: action.bucket,
        object: action.object
      });
    }
  }

  getActionHistory(): ActionHistoryEntry[] {
    return [...this.actionHistory];
  }

  clearHistory() {
    this.actionHistory = [];
    this.notifyHistoryListeners();
  }

  // Gestion des listeners
  onLogsChange(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  onHistoryChange(listener: (history: ActionHistoryEntry[]) => void) {
    this.historyListeners.push(listener);
    return () => {
      this.historyListeners = this.historyListeners.filter(l => l !== listener);
    };
  }

  private notifyLogListeners() {
    this.listeners.forEach(listener => listener(this.logs));
  }

  private notifyHistoryListeners() {
    this.historyListeners.forEach(listener => listener(this.actionHistory));
  }
}

export const logService = new LogService();
