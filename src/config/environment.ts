/**
 * Configuration centralisée de l'application
 * Utilise les variables d'environnement Vite (VITE_*) avec fallback sur valeurs par défaut
 * 
 * Pour la production:
 * - Définir VITE_PROXY_URL dans les ConfigMaps Kubernetes
 * - Pas besoin de rebuild, juste redéployer avec nouvelles variables
 */

interface AppConfig {
  // Configuration du proxy S3
  proxy: {
    url: string;
    timeout: number;
  };
  
  // Configuration des endpoints Outscale
  endpoints: {
    'eu-west-2': string;
    'us-east-2': string;
    'us-west-1': string;
    'cloudgouv-eu-west-1': string;
    'ap-northeast-1': string;
  };
  
  // Configuration du cache
  cache: {
    enabled: boolean;
    ttl: {
      buckets: number;
      objects: number;
      credentials: number;
    };
  };
  
  // Configuration des logs
  logging: {
    enabled: boolean;
    level: 'debug' | 'info' | 'warn' | 'error';
  };
  
  // Configuration des uploads
  upload: {
    maxConcurrent: number;
    chunkSize: number;
    timeout: number;
  };
  
  // Configuration du retry
  retry: {
    maxAttempts: number;
    baseDelay: number;
    maxDelay: number;
  };
}

class Environment {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): AppConfig {
    // Détection de l'environnement
    const isDev = import.meta.env.DEV;
    const isProd = import.meta.env.PROD;
    
    return {
      proxy: {
        // Variable d'environnement ou valeur par défaut selon l'environnement
        url: import.meta.env.VITE_PROXY_URL || (isDev ? 'http://localhost:3001/api' : '/api'),
        timeout: Number(import.meta.env.VITE_PROXY_TIMEOUT) || 30000,
      },
      
      endpoints: {
        'eu-west-2': import.meta.env.VITE_ENDPOINT_EU_WEST_2 || 'https://oos.eu-west-2.outscale.com',
        'us-east-2': import.meta.env.VITE_ENDPOINT_US_EAST_2 || 'https://oos.us-east-2.outscale.com',
        'us-west-1': import.meta.env.VITE_ENDPOINT_US_WEST_1 || 'https://oos.us-west-1.outscale.com',
        'cloudgouv-eu-west-1': import.meta.env.VITE_ENDPOINT_CLOUDGOUV || 'https://oos.cloudgouv-eu-west-1.outscale.com',
        'ap-northeast-1': import.meta.env.VITE_ENDPOINT_AP_NORTHEAST_1 || 'https://oos.ap-northeast-1.outscale.com',
      },
      
      cache: {
        enabled: import.meta.env.VITE_CACHE_ENABLED !== 'false',
        ttl: {
          buckets: Number(import.meta.env.VITE_CACHE_TTL_BUCKETS) || 300000, // 5 min
          objects: Number(import.meta.env.VITE_CACHE_TTL_OBJECTS) || 180000, // 3 min
          credentials: Number(import.meta.env.VITE_CACHE_TTL_CREDENTIALS) || 1800000, // 30 min
        },
      },
      
      logging: {
        enabled: import.meta.env.VITE_LOGGING_ENABLED !== 'false',
        level: (import.meta.env.VITE_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || (isDev ? 'debug' : 'info'),
      },
      
      upload: {
        maxConcurrent: Number(import.meta.env.VITE_UPLOAD_MAX_CONCURRENT) || 5,
        chunkSize: Number(import.meta.env.VITE_UPLOAD_CHUNK_SIZE) || 5242880, // 5 MB
        timeout: Number(import.meta.env.VITE_UPLOAD_TIMEOUT) || 60000, // 60 sec
      },
      
      retry: {
        maxAttempts: Number(import.meta.env.VITE_RETRY_MAX_ATTEMPTS) || 3,
        baseDelay: Number(import.meta.env.VITE_RETRY_BASE_DELAY) || 1000,
        maxDelay: Number(import.meta.env.VITE_RETRY_MAX_DELAY) || 10000,
      },
    };
  }

  // Getters pour accéder à la configuration
  get proxyUrl(): string {
    return this.config.proxy.url;
  }

  get proxyTimeout(): number {
    return this.config.proxy.timeout;
  }

  getEndpoint(region: string): string {
    return this.config.endpoints[region as keyof typeof this.config.endpoints] 
      || this.config.endpoints['eu-west-2'];
  }

  get endpoints(): typeof this.config.endpoints {
    return this.config.endpoints;
  }

  get cacheEnabled(): boolean {
    return this.config.cache.enabled;
  }

  get cacheTTL() {
    return this.config.cache.ttl;
  }

  get loggingEnabled(): boolean {
    return this.config.logging.enabled;
  }

  get logLevel(): string {
    return this.config.logging.level;
  }

  get uploadConfig() {
    return this.config.upload;
  }

  get retryConfig() {
    return this.config.retry;
  }

  // Méthode pour afficher la configuration (utile pour debug)
  printConfig(): void {
    console.log('📋 Configuration de l\'application:', {
      environment: import.meta.env.MODE,
      proxy: this.config.proxy.url,
      logging: `${this.config.logging.level} (${this.config.logging.enabled ? 'enabled' : 'disabled'})`,
      cache: this.config.cache.enabled ? 'enabled' : 'disabled',
    });
  }
}

// Export d'une instance singleton
export const env = new Environment();
