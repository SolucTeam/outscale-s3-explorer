
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

interface UserHistory {
  entries: ActionHistoryEntry[];
  isLoggingEnabled: boolean;
}

interface ActionHistoryStore {
  userHistories: Record<string, UserHistory>;
  currentUserId: string | null;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  addEntry: (entry: Omit<ActionHistoryEntry, 'id' | 'timestamp'>) => void;
  updateEntry: (id: string, updates: Partial<ActionHistoryEntry>) => void;
  clearHistory: () => void;
  clearAllHistories: () => void;
  toggleLogging: () => void;
  getEntriesByType: (operationType: ActionHistoryEntry['operationType']) => ActionHistoryEntry[];
  getRecentEntries: (limit?: number) => ActionHistoryEntry[];
  getCurrentUserEntries: () => ActionHistoryEntry[];
}

const createUserHistoryKey = (accessKey: string, region: string): string => {
  return `${accessKey.substring(0, 8)}_${region}`;
};

export const useActionHistoryStore = create<ActionHistoryStore>()(
  persist(
    (set, get) => ({
      userHistories: {},
      currentUserId: null,
      
      setCurrentUser: (userId) => {
        set({ currentUserId: userId });
        
        // Initialiser l'historique pour ce user s'il n'existe pas
        const state = get();
        if (!state.userHistories[userId]) {
          set(prev => ({
            userHistories: {
              ...prev.userHistories,
              [userId]: {
                entries: [],
                isLoggingEnabled: true
              }
            }
          }));
        }
      },
      
      addEntry: (entry) => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId) return;
        
        const newEntry: ActionHistoryEntry = {
          ...entry,
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date()
        };
        
        // Console logging avec timestamps
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
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              entries: [newEntry, ...(state.userHistories[userId]?.entries || [])].slice(0, 1000)
            }
          }
        }));
      },
      
      updateEntry: (id, updates) => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId || !state.userHistories[userId]) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              entries: state.userHistories[userId].entries.map(entry => 
                entry.id === id 
                  ? { ...entry, ...updates, timestamp: entry.timestamp }
                  : entry
              )
            }
          }
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
      
      clearHistory: () => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              entries: []
            }
          }
        }));
      },
      
      clearAllHistories: () => set({ userHistories: {} }),
      
      toggleLogging: () => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              isLoggingEnabled: !state.userHistories[userId]?.isLoggingEnabled
            }
          }
        }));
      },
      
      getCurrentUserEntries: () => {
        const state = get();
        const userId = state.currentUserId;
        return userId && state.userHistories[userId] ? state.userHistories[userId].entries : [];
      },
      
      getEntriesByType: (operationType) => {
        const entries = get().getCurrentUserEntries();
        return entries.filter(entry => entry.operationType === operationType);
      },
      
      getRecentEntries: (limit = 50) => {
        const entries = get().getCurrentUserEntries();
        return entries.slice(0, limit);
      }
    }),
    {
      name: 'action-history-storage',
      partialize: (state) => ({ 
        userHistories: state.userHistories
      })
    }
  )
);

// Helper function pour créer un ID utilisateur basé sur les credentials
export { createUserHistoryKey };
