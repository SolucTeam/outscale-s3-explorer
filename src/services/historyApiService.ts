/**
 * Service API pour la synchronisation de l'historique avec le backend
 */

import { env } from '@/config/environment';
import { useS3Store } from '@/hooks/useS3Store';
import { ActionHistoryEntry, OperationType, LogLevel } from '@/stores/actionHistoryStore';

interface HistoryApiEntry {
  id: string;
  timestamp: string;
  operationType: OperationType;
  status: 'started' | 'progress' | 'success' | 'error';
  bucketName?: string;
  objectName?: string;
  details?: string;
  errorCode?: string;
  progress?: number;
  logLevel: LogLevel;
  userFriendlyMessage: string;
}

interface HistoryApiResponse {
  success: boolean;
  data?: HistoryApiEntry[];
  total?: number;
  limit?: number;
  offset?: number;
  error?: string;
  message?: string;
}

interface HistoryStatsResponse {
  success: boolean;
  data?: {
    total: number;
    successCount: number;
    errorCount: number;
    operationTypes: number;
    bucketsUsed: number;
    topOperations: { operationType: string; count: number }[];
  };
}

interface HistoryPreferencesResponse {
  success: boolean;
  data?: {
    isLoggingEnabled: boolean;
  };
}

class HistoryApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = env.proxyUrl || 'http://localhost:3001';
  }

  /**
   * Récupère les headers d'authentification
   */
  private getAuthHeaders(): HeadersInit {
    const credentials = useS3Store.getState().credentials;
    if (!credentials) {
      throw new Error('Non authentifié');
    }
    
    return {
      'Content-Type': 'application/json',
      'x-access-key': credentials.accessKey,
      'x-secret-key': credentials.secretKey,
      'x-region': credentials.region
    };
  }

  /**
   * Vérifie si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    const credentials = useS3Store.getState().credentials;
    return !!credentials?.accessKey;
  }

  /**
   * Récupère l'historique depuis le serveur
   */
  async getHistory(options: {
    limit?: number;
    offset?: number;
    operationType?: OperationType;
    status?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<{ entries: ActionHistoryEntry[]; total: number }> {
    if (!this.isAuthenticated()) {
      return { entries: [], total: 0 };
    }

    try {
      const params = new URLSearchParams();
      if (options.limit) params.set('limit', options.limit.toString());
      if (options.offset) params.set('offset', options.offset.toString());
      if (options.operationType) params.set('operationType', options.operationType);
      if (options.status) params.set('status', options.status);
      if (options.startDate) params.set('startDate', options.startDate);
      if (options.endDate) params.set('endDate', options.endDate);
      if (options.search) params.set('search', options.search);

      const response = await fetch(
        `${this.baseUrl}/api/history?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeaders()
        }
      );

      const data: HistoryApiResponse = await response.json();

      if (data.success && data.data) {
        const entries: ActionHistoryEntry[] = data.data.map(entry => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
        return { entries, total: data.total || entries.length };
      }

      return { entries: [], total: 0 };
    } catch (error) {
      console.error('Erreur récupération historique distant:', error);
      return { entries: [], total: 0 };
    }
  }

  /**
   * Ajoute une entrée à l'historique distant
   */
  async addEntry(entry: Omit<ActionHistoryEntry, 'id' | 'timestamp'> & { id: string; timestamp: Date }): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          ...entry,
          timestamp: entry.timestamp.toISOString()
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Erreur ajout historique distant:', error);
      return false;
    }
  }

  /**
   * Met à jour une entrée existante
   */
  async updateEntry(id: string, updates: Partial<ActionHistoryEntry>): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history/${id}`, {
        method: 'PATCH',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Erreur mise à jour historique distant:', error);
      return false;
    }
  }

  /**
   * Synchronise les entrées locales avec le serveur
   */
  async syncEntries(entries: ActionHistoryEntry[]): Promise<{ success: boolean; syncedCount: number }> {
    if (!this.isAuthenticated() || entries.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history/sync`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          entries: entries.map(entry => ({
            ...entry,
            timestamp: entry.timestamp instanceof Date 
              ? entry.timestamp.toISOString() 
              : entry.timestamp
          }))
        })
      });

      const data = await response.json();
      
      if (data.success) {
        const syncedCount = parseInt(data.message?.match(/\d+/)?.[0] || '0');
        return { success: true, syncedCount };
      }
      
      return { success: false, syncedCount: 0 };
    } catch (error) {
      console.error('Erreur synchronisation historique:', error);
      return { success: false, syncedCount: 0 };
    }
  }

  /**
   * Supprime l'historique distant
   */
  async clearHistory(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Erreur suppression historique distant:', error);
      return false;
    }
  }

  /**
   * Récupère les statistiques d'historique
   */
  async getStats(): Promise<HistoryStatsResponse['data'] | null> {
    if (!this.isAuthenticated()) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history/stats`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data: HistoryStatsResponse = await response.json();
      return data.success ? data.data || null : null;
    } catch (error) {
      console.error('Erreur statistiques historique:', error);
      return null;
    }
  }

  /**
   * Récupère les préférences utilisateur
   */
  async getPreferences(): Promise<{ isLoggingEnabled: boolean }> {
    if (!this.isAuthenticated()) {
      return { isLoggingEnabled: true };
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history/preferences`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data: HistoryPreferencesResponse = await response.json();
      return data.success && data.data ? data.data : { isLoggingEnabled: true };
    } catch (error) {
      console.error('Erreur préférences historique:', error);
      return { isLoggingEnabled: true };
    }
  }

  /**
   * Met à jour les préférences utilisateur
   */
  async setPreferences(preferences: { isLoggingEnabled: boolean }): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/api/history/preferences`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(preferences)
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Erreur mise à jour préférences:', error);
      return false;
    }
  }
}

export const historyApiService = new HistoryApiService();
