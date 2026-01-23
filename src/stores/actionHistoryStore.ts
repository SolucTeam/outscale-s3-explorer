import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LogLevel = 'info' | 'warning' | 'error';

// 🎯 TOUTES LES OPÉRATIONS S3 POSSIBLES
export type OperationType = 
  // Buckets
  | 'bucket_create'
  | 'bucket_delete'
  | 'bucket_list'
  | 'bucket_empty'
  | 'bucket_configure'
  
  // Objects - Basique
  | 'object_upload'
  | 'object_delete'
  | 'object_download'
  | 'object_list'
  | 'object_view'
  
  // Objects - Avancé
  | 'object_copy'
  | 'object_move'
  | 'object_rename'
  | 'object_restore'
  
  // Folders
  | 'folder_create'
  | 'folder_delete'
  | 'folder_move'
  | 'folder_copy'
  
  // Bulk Operations
  | 'bulk_upload'
  | 'bulk_delete'
  | 'bulk_download'
  | 'bulk_copy'
  | 'bulk_move'
  
  // Metadata & Tags
  | 'tags_add'
  | 'tags_update'
  | 'tags_delete'
  | 'metadata_update'
  
  // Versioning
  | 'version_list'
  | 'version_restore'
  | 'version_delete'
  | 'versioning_enable'
  | 'versioning_disable'
  
  // Access Control
  | 'acl_update'
  | 'policy_update'
  | 'cors_update'
  
  // Cross-Account Sharing
  | 'share_add'
  | 'share_update'
  | 'share_revoke'
  
  // Lifecycle
  | 'lifecycle_add_rule'
  | 'lifecycle_update_rule'
  | 'lifecycle_delete_rule'
  
  // Replication
  | 'replication_enable'
  | 'replication_disable'
  | 'replication_configure'
  
  // Encryption
  | 'encryption_enable'
  | 'encryption_disable'
  | 'encryption_update'
  
  // Object Lock
  | 'object_lock_enable'
  | 'object_lock_configure'
  | 'retention_set'
  | 'legal_hold_set'
  
  // Logging & Monitoring
  | 'logging_enable'
  | 'logging_disable'
  | 'metrics_configure'
  
  // Website Hosting
  | 'website_enable'
  | 'website_disable'
  | 'website_configure'
  
  // Notification
  | 'notification_add'
  | 'notification_update'
  | 'notification_delete'
  
  // Inventory
  | 'inventory_enable'
  | 'inventory_configure'
  | 'inventory_delete'
  
  // Analytics
  | 'analytics_enable'
  | 'analytics_configure'
  | 'analytics_disable'
  
  // Multipart Upload
  | 'multipart_init'
  | 'multipart_upload_part'
  | 'multipart_complete'
  | 'multipart_abort'
  | 'multipart_list'
  
  // Presigned URLs
  | 'presigned_url_generate'
  | 'presigned_url_upload'
  | 'presigned_url_download'
  
  // Transfer Acceleration
  | 'acceleration_enable'
  | 'acceleration_disable'
  
  // Batch Operations
  | 'batch_job_create'
  | 'batch_job_status'
  | 'batch_job_cancel'
  
  // Storage Class
  | 'storage_class_change'
  | 'storage_class_transition'
  
  // Glacier
  | 'glacier_archive'
  | 'glacier_restore'
  | 'glacier_retrieve'
  
  // Search & Query
  | 'select_query'
  | 'search_objects'
  
  // Sync & Backup
  | 'sync_start'
  | 'sync_status'
  | 'backup_create'
  | 'backup_restore';

export interface ActionHistoryEntry {
  id: string;
  timestamp: Date;
  operationType: OperationType;
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
  lastSyncedAt?: string;
  pendingSync: ActionHistoryEntry[];
}

interface ActionHistoryStore {
  userHistories: Record<string, UserHistory>;
  currentUserId: string | null;
  isSyncing: boolean;
  syncEnabled: boolean;
  
  // Actions
  setCurrentUser: (userId: string) => void;
  addEntry: (entry: Omit<ActionHistoryEntry, 'id' | 'timestamp'>) => void;
  updateEntry: (id: string, updates: Partial<ActionHistoryEntry>) => void;
  clearHistory: () => void;
  clearAllHistories: () => void;
  toggleLogging: () => void;
  getEntriesByType: (operationType: OperationType) => ActionHistoryEntry[];
  getRecentEntries: (limit?: number) => ActionHistoryEntry[];
  getCurrentUserEntries: () => ActionHistoryEntry[];
  
  // Sync actions
  setSyncEnabled: (enabled: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  markEntriesAsSynced: (entryIds: string[]) => void;
  addPendingEntry: (entry: ActionHistoryEntry) => void;
  clearPendingEntries: () => void;
  getPendingEntries: () => ActionHistoryEntry[];
  mergeRemoteEntries: (entries: ActionHistoryEntry[]) => void;
  setLastSyncedAt: (timestamp: string) => void;
}

export const useActionHistoryStore = create<ActionHistoryStore>()(
  persist(
    (set, get) => ({
      userHistories: {},
      currentUserId: null,
      isSyncing: false,
      syncEnabled: true,
      
      setCurrentUser: (userId) => {
        console.log('📝 Setting current user:', userId);
        set({ currentUserId: userId });
        
        // Initialiser l'historique pour ce user s'il n'existe pas
        const state = get();
        if (!state.userHistories[userId]) {
          console.log('🆕 Creating new history for user:', userId);
          set(prev => ({
            userHistories: {
              ...prev.userHistories,
              [userId]: {
                entries: [],
                isLoggingEnabled: true,
                pendingSync: []
              }
            }
          }));
        } else {
          console.log('✅ User history exists:', state.userHistories[userId].entries.length, 'entries');
        }
      },
      
      addEntry: (entry) => {
        const state = get();
        const userId = state.currentUserId;
        
        console.log('📥 Adding entry, current user:', userId);
        
        if (!userId) {
          console.error('❌ Cannot add entry: no current user set');
          return;
        }
        
        const userHistory = state.userHistories[userId];
        if (!userHistory) {
          console.error('❌ Cannot add entry: user history not initialized');
          return;
        }
        
        if (!userHistory.isLoggingEnabled) {
          console.log('⏸️ Logging disabled for user:', userId);
          return;
        }
        
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
        
        set(state => {
          const updatedEntries = [newEntry, ...(state.userHistories[userId]?.entries || [])].slice(0, 1000);
          const updatedPending = state.syncEnabled 
            ? [newEntry, ...(state.userHistories[userId]?.pendingSync || [])]
            : state.userHistories[userId]?.pendingSync || [];
          
          console.log('✅ Entry added. Total entries:', updatedEntries.length);
          
          return {
            userHistories: {
              ...state.userHistories,
              [userId]: {
                ...state.userHistories[userId],
                entries: updatedEntries,
                pendingSync: updatedPending
              }
            }
          };
        });
      },
      
      updateEntry: (id, updates) => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId || !state.userHistories[userId]) {
          console.error('❌ Cannot update entry: invalid user');
          return;
        }
        
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
        
        console.log('🗑️ Clearing history for user:', userId);
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              entries: [],
              pendingSync: []
            }
          }
        }));
      },
      
      clearAllHistories: () => {
        console.log('🗑️ Clearing all histories');
        set({ userHistories: {} });
      },
      
      toggleLogging: () => {
        const state = get();
        const userId = state.currentUserId;
        
        if (!userId) return;
        
        const newState = !state.userHistories[userId]?.isLoggingEnabled;
        console.log('🔄 Toggle logging for user:', userId, '→', newState);
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              isLoggingEnabled: newState
            }
          }
        }));
      },
      
      getCurrentUserEntries: () => {
        const state = get();
        const userId = state.currentUserId;
        const entries = userId && state.userHistories[userId] ? state.userHistories[userId].entries : [];
        console.log('📊 Getting entries for user:', userId, '→', entries.length, 'entries');
        return entries;
      },
      
      getEntriesByType: (operationType) => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return [];
        
        return state.userHistories[userId].entries.filter(
          entry => entry.operationType === operationType
        );
      },
      
      getRecentEntries: (limit = 10) => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return [];
        
        return state.userHistories[userId].entries.slice(0, limit);
      },
      
      // Sync actions
      setSyncEnabled: (enabled) => {
        set({ syncEnabled: enabled });
      },
      
      setIsSyncing: (syncing) => {
        set({ isSyncing: syncing });
      },
      
      markEntriesAsSynced: (entryIds) => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              pendingSync: state.userHistories[userId].pendingSync.filter(
                entry => !entryIds.includes(entry.id)
              )
            }
          }
        }));
      },
      
      addPendingEntry: (entry) => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              pendingSync: [entry, ...(state.userHistories[userId].pendingSync || [])]
            }
          }
        }));
      },
      
      clearPendingEntries: () => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              pendingSync: []
            }
          }
        }));
      },
      
      getPendingEntries: () => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return [];
        return state.userHistories[userId].pendingSync || [];
      },
      
      mergeRemoteEntries: (remoteEntries) => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return;
        
        const localEntries = state.userHistories[userId].entries;
        const localIds = new Set(localEntries.map(e => e.id));
        
        // Ajouter les entrées distantes qui n'existent pas localement
        const newEntries = remoteEntries.filter(e => !localIds.has(e.id));
        
        if (newEntries.length > 0) {
          const mergedEntries = [...localEntries, ...newEntries]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 1000);
          
          set(state => ({
            userHistories: {
              ...state.userHistories,
              [userId]: {
                ...state.userHistories[userId],
                entries: mergedEntries
              }
            }
          }));
          
          console.log(`📥 Merged ${newEntries.length} remote entries`);
        }
      },
      
      setLastSyncedAt: (timestamp) => {
        const state = get();
        const userId = state.currentUserId;
        if (!userId || !state.userHistories[userId]) return;
        
        set(state => ({
          userHistories: {
            ...state.userHistories,
            [userId]: {
              ...state.userHistories[userId],
              lastSyncedAt: timestamp
            }
          }
        }));
      }
    }),
    {
      name: 'action-history-storage',
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        console.log('🔄 Migrating action history storage from version:', version);
        const state = persistedState as ActionHistoryStore;
        
        // Migration v1 -> v2: ajouter pendingSync
        if (version < 2) {
          Object.keys(state.userHistories || {}).forEach(userId => {
            if (!state.userHistories[userId].pendingSync) {
              state.userHistories[userId].pendingSync = [];
            }
          });
        }
        
        return state;
      },
      partialize: (state) => ({
        userHistories: state.userHistories,
        currentUserId: state.currentUserId,
        syncEnabled: state.syncEnabled
      }),
      onRehydrateStorage: () => {
        console.log('💧 Rehydrating action history store...');
        return (state, error) => {
          if (error) {
            console.error('❌ Error rehydrating action history:', error);
          } else if (state) {
            console.log('✅ Action history rehydrated');
            console.log('📊 Current user:', state.currentUserId);
            console.log('👥 Total users:', Object.keys(state.userHistories).length);
            
            // Convertir les timestamps string en Date objects
            Object.keys(state.userHistories).forEach(userId => {
              state.userHistories[userId].entries = state.userHistories[userId].entries.map(entry => ({
                ...entry,
                timestamp: new Date(entry.timestamp)
              }));
              
              // S'assurer que pendingSync existe
              if (!state.userHistories[userId].pendingSync) {
                state.userHistories[userId].pendingSync = [];
              }
            });
          }
        };
      }
    }
  )
);
