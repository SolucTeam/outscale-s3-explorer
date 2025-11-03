/**
 * Service de cache intelligent multi-niveaux
 * Cache Map avec invalidation TTL pour performance optimale
 * TTL configurables via variables d'environnement
 */

import { env } from '@/config/environment';

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class CacheService {
  private static instance: CacheService;
  private cache = new Map<string, CacheEntry<any>>();
  
  // TTL par type de données (configurables via environnement)
  static get TTL() {
    return {
      BUCKETS: env.cacheTTL.buckets,
      OBJECTS: env.cacheTTL.objects,
      CREDENTIALS: env.cacheTTL.credentials,
      METADATA: 10 * 60 * 1000  // 10 minutes (fallback)
    };
  }

  static getInstance(): CacheService {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  /**
   * Met en cache avec TTL
   */
  set<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });

    // Auto-nettoyage après expiration
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  /**
   * Récupère depuis le cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    const now = Date.now();
    const age = now - entry.timestamp;
    
    // Vérifie si expiré
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  /**
   * Supprime une entrée
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Vide le cache par pattern
   */
  clearByPattern(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Vide tout le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Statistiques du cache
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;
    
    for (const entry of this.cache.values()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }
    
    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      hitRate: validEntries / (validEntries + expiredEntries) || 0
    };
  }

  /**
   * Nettoyage des entrées expirées
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Auto-nettoyage périodique
   */
  startAutoCleanup(interval: number = 5 * 60 * 1000): void {
    setInterval(() => {
      this.cleanup();
    }, interval);
  }
}

// Instance globale
export const cacheService = CacheService.getInstance();