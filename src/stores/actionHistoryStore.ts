
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LogLevel = 'info' | 'warning' | 'error';

export interface ActionHistoryEntry {
  id: string;
  timestamp: Date;
  operationType: 'bucket_create' | 'bucket_delete' | 'object_upload' | 'object_delete' | 'folder_create' | 'folder_delete' | 'object_download';
  status: 'started' | 'progress' | 'success' | 'error';
  objectName?: string;
  bucketName?: string;
  details?: string;
  errorCode?: string;
  progress?: number;
  logLevel: LogLevel;
  userFriendlyMessage: string;
}

interface ActionHistoryStore {
  entries: ActionHistoryEntry[];
  isLoggingEnabled: boolean;
  
  // Actions
  addEntry: (entry: Omit<ActionHistoryEntry, 'id' | 'timestamp'>) => void;
  updateEntry: (id: string, updates: Partial<ActionHistoryEntry>) => void;
  clearHistory: () => void;
  toggleLogging: () => void;
  getEntriesByType: (operationType: ActionHistoryEntry['operationType']) => ActionHistoryEntry[];
  getRecentEntries: (limit?: number) => ActionHistoryEntry[];
}

export const useActionHistoryStore = create<ActionHistoryStore>()(
  persist(
    (set, get) => ({
      entries: [],
      isLoggingEnabled: true,
      
      addEntry: (entry) => {
        const newEntry: ActionHistoryEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        
        // Console logging with timestamps
        const timestamp = newEntry.timestamp.toLocaleTimeString();
        const logMessage = `[${timestamp}] ${entry.operationType.toUpperCase()}: ${entry.userFriendlyMessage}`;
        
        switch (entry.logLevel) {
          case 'info':
            console.log(`ℹ️ ${logMessage}`, entry.details ? { details: entry.details } : '');
            break;
          case 'warning':
            console.warn(`⚠️ ${logMessage}`, entry.details ? { details: entry.details } : '');
            break;
          case 'error':
            console.error(`❌ ${logMessage}`, entry.details ? { details: entry.details, errorCode: entry.errorCode } : '');
            break;
        }
        
        set(state => ({
          entries: [newEntry, ...state.entries].slice(0, 1000) // Keep last 1000 entries
        }));
      },
      
      updateEntry: (id, updates) => {
        set(state => ({
          entries: state.entries.map(entry => 
            entry.id === id 
              ? { ...entry, ...updates, timestamp: entry.timestamp } // Keep original timestamp
              : entry
          )
        }));
        
        // Log the update
        if (updates.status && updates.userFriendlyMessage) {
          const timestamp = new Date().toLocaleTimeString();
          const logMessage = `[${timestamp}] UPDATE: ${updates.userFriendlyMessage}`;
          
          switch (updates.logLevel || 'info') {
            case 'info':
              console.log(`ℹ️ ${logMessage}`);
              break;
            case 'warning':
              console.warn(`⚠️ ${logMessage}`);
              break;
            case 'error':
              console.error(`❌ ${logMessage}`);
              break;
          }
        }
      },
      
      clearHistory: () => set({ entries: [] }),
      
      toggleLogging: () => set(state => ({ isLoggingEnabled: !state.isLoggingEnabled })),
      
      getEntriesByType: (operationType) => {
        return get().entries.filter(entry => entry.operationType === operationType);
      },
      
      getRecentEntries: (limit = 50) => {
        return get().entries.slice(0, limit);
      }
    }),
    {
      name: 'action-history-storage',
      partialize: (state) => ({ 
        entries: state.entries,
        isLoggingEnabled: state.isLoggingEnabled 
      })
    }
  )
);
