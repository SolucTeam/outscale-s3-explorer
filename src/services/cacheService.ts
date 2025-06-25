
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
}

interface CacheStats {
  hits: number;
  misses: number;
  entries: number;
  hitRate: number;
}

export class CacheService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static stats = { hits: 0, misses: 0 };

  // TTL par type de données (en millisecondes)
  private static ttlConfig = {
    buckets: 5 * 60 * 1000,      // 5 minutes
    objects: 2 * 60 * 1000,      // 2 minutes
    regions: 30 * 60 * 1000,     // 30 minutes
    user: 10 * 60 * 1000,        // 10 minutes
    metadata: 1 * 60 * 1000      // 1 minute
  };

  static set<T>(key: string, data: T, type: keyof typeof CacheService.ttlConfig = 'metadata'): void {
    const ttl = this.ttlConfig[type];
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key
    };

    this.cache.set(key, entry);
    this.cleanupExpired();
  }

  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Vérifier si l'entrée a expiré
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data as T;
  }

  static has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  static delete(key: string): boolean {
    return this.cache.delete(key);
  }

  static clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };
  }

  static invalidatePattern(pattern: string): void {
    const keysToDelete: string[] = [];
    
    this.cache.forEach((entry, key) => {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  static getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      entries: this.cache.size,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0
    };
  }

  private static cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // Méthodes utilitaires pour générer des clés de cache
  static getBucketsCacheKey(region: string, userId: string): string {
    return `buckets:${region}:${userId}`;
  }

  static getObjectsCacheKey(bucket: string, path: string, userId: string): string {
    return `objects:${bucket}:${path}:${userId}`;
  }

  static getRegionsCacheKey(): string {
    return 'regions:list';
  }

  static getUserCacheKey(userId: string): string {
    return `user:${userId}`;
  }

  // Invalidation intelligente
  static invalidateBucket(bucketName: string, userId: string): void {
    this.invalidatePattern(`buckets:${userId}`);
    this.invalidatePattern(`objects:${bucketName}:${userId}`);
  }

  static invalidateObjects(bucketName: string, userId: string): void {
    this.invalidatePattern(`objects:${bucketName}:${userId}`);
  }

  static invalidateUser(userId: string): void {
    this.invalidatePattern(userId);
  }
}
