/**
 * Hook pour la synchronisation automatique de l'historique
 * avec le backend SQLite
 */

import { useEffect, useCallback, useRef } from 'react';
import { useActionHistoryStore } from '@/stores/actionHistoryStore';
import { historyApiService } from '@/services/historyApiService';
import { useS3Store } from '@/hooks/useS3Store';

interface UseHistorySyncOptions {
  /** Intervalle de synchronisation en ms (défaut: 30 secondes) */
  syncInterval?: number;
  /** Activer la synchronisation automatique */
  autoSync?: boolean;
  /** Nombre max d'entrées à synchroniser par lot */
  batchSize?: number;
}

export function useHistorySync(options: UseHistorySyncOptions = {}) {
  const {
    syncInterval = 30000,
    autoSync = true,
    batchSize = 50
  } = options;

  const { isAuthenticated } = useS3Store();
  const {
    isSyncing,
    syncEnabled,
    setIsSyncing,
    getPendingEntries,
    clearPendingEntries,
    mergeRemoteEntries,
    setLastSyncedAt,
    getCurrentUserEntries
  } = useActionHistoryStore();

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialSyncDoneRef = useRef(false);

  /**
   * Synchronise les entrées locales pendantes vers le serveur
   */
  const syncPendingToServer = useCallback(async () => {
    if (!historyApiService.isAuthenticated() || isSyncing) {
      return { success: false, syncedCount: 0 };
    }

    const pendingEntries = getPendingEntries();
    if (pendingEntries.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    setIsSyncing(true);

    try {
      // Synchroniser par lots
      const entriesToSync = pendingEntries.slice(0, batchSize);
      const result = await historyApiService.syncEntries(entriesToSync);

      if (result.success) {
        clearPendingEntries();
        setLastSyncedAt(new Date().toISOString());
        console.log(`✅ Synced ${result.syncedCount} entries to server`);
      }

      return result;
    } catch (error) {
      console.error('❌ Sync error:', error);
      return { success: false, syncedCount: 0 };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, getPendingEntries, setIsSyncing, clearPendingEntries, setLastSyncedAt, batchSize]);

  /**
   * Récupère l'historique depuis le serveur et fusionne avec le local
   */
  const fetchFromServer = useCallback(async (limit = 200) => {
    if (!historyApiService.isAuthenticated() || isSyncing) {
      return { success: false, entries: [] };
    }

    setIsSyncing(true);

    try {
      const { entries, total } = await historyApiService.getHistory({ limit });
      
      if (entries.length > 0) {
        mergeRemoteEntries(entries);
        console.log(`📥 Fetched ${entries.length} entries from server (total: ${total})`);
      }

      return { success: true, entries, total };
    } catch (error) {
      console.error('❌ Fetch error:', error);
      return { success: false, entries: [] };
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, setIsSyncing, mergeRemoteEntries]);

  /**
   * Synchronisation complète : push local + pull distant
   */
  const fullSync = useCallback(async () => {
    if (!historyApiService.isAuthenticated()) {
      return { success: false };
    }

    console.log('🔄 Starting full sync...');

    // 1. Envoyer les entrées locales pendantes
    const pushResult = await syncPendingToServer();

    // 2. Récupérer les entrées distantes
    const pullResult = await fetchFromServer();

    console.log('✅ Full sync complete');

    return {
      success: pushResult.success && pullResult.success,
      pushed: pushResult.syncedCount,
      pulled: pullResult.entries?.length || 0
    };
  }, [syncPendingToServer, fetchFromServer]);

  /**
   * Migration initiale : envoie tout l'historique local existant
   */
  const migrateLocalToServer = useCallback(async () => {
    if (!historyApiService.isAuthenticated()) {
      return { success: false };
    }

    const localEntries = getCurrentUserEntries();
    if (localEntries.length === 0) {
      return { success: true, migratedCount: 0 };
    }

    console.log(`📤 Migrating ${localEntries.length} local entries to server...`);

    const result = await historyApiService.syncEntries(localEntries);

    if (result.success) {
      console.log(`✅ Migrated ${result.syncedCount} entries`);
    }

    return {
      success: result.success,
      migratedCount: result.syncedCount
    };
  }, [getCurrentUserEntries]);

  /**
   * Efface l'historique local ET distant
   */
  const clearAllHistory = useCallback(async () => {
    const store = useActionHistoryStore.getState();
    
    // Effacer local
    store.clearHistory();

    // Effacer distant
    if (historyApiService.isAuthenticated()) {
      await historyApiService.clearHistory();
    }

    console.log('🗑️ All history cleared');
  }, []);

  /**
   * Récupère les statistiques d'historique
   */
  const getStats = useCallback(async () => {
    return await historyApiService.getStats();
  }, []);

  // Synchronisation initiale à l'authentification
  useEffect(() => {
    if (isAuthenticated && syncEnabled && !initialSyncDoneRef.current) {
      initialSyncDoneRef.current = true;
      
      // Attendre un peu pour laisser le store s'initialiser
      const timeout = setTimeout(() => {
        fullSync();
      }, 1000);

      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, syncEnabled, fullSync]);

  // Synchronisation périodique automatique
  useEffect(() => {
    if (!autoSync || !isAuthenticated || !syncEnabled) {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      return;
    }

    syncTimeoutRef.current = setInterval(() => {
      syncPendingToServer();
    }, syncInterval);

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
    };
  }, [autoSync, isAuthenticated, syncEnabled, syncInterval, syncPendingToServer]);

  // Reset initial sync flag when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      initialSyncDoneRef.current = false;
    }
  }, [isAuthenticated]);

  return {
    isSyncing,
    syncEnabled,
    syncPendingToServer,
    fetchFromServer,
    fullSync,
    migrateLocalToServer,
    clearAllHistory,
    getStats
  };
}
