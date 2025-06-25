
import { ErrorService, AppError } from './errorService';

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
}

export interface RetryState {
  attempt: number;
  nextDelay: number;
  isRetrying: boolean;
  error?: AppError;
}

export class RetryService {
  private static defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true
  };

  static async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    onRetry?: (state: RetryState) => void
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: any;
    let delay = finalConfig.baseDelay;

    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        const appError = ErrorService.parseError(error);
        
        // Ne pas retry si l'erreur n'est pas retriable
        if (!ErrorService.shouldRetry(appError)) {
          throw error;
        }

        // Dernier essai atteint
        if (attempt === finalConfig.maxAttempts) {
          throw error;
        }

        // Calculer le délai avec exponential backoff et jitter
        const currentDelay = Math.min(delay, finalConfig.maxDelay);
        const jitteredDelay = finalConfig.jitter 
          ? currentDelay + (Math.random() * currentDelay * 0.1)
          : currentDelay;

        const retryState: RetryState = {
          attempt,
          nextDelay: Math.round(jitteredDelay),
          isRetrying: true,
          error: appError
        };

        if (onRetry) {
          onRetry(retryState);
        }

        await this.sleep(jitteredDelay);
        delay *= finalConfig.backoffFactor;
      }
    }

    throw lastError;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  static getRetryConfig(operationType: 'auth' | 'bucket' | 'object' | 'upload'): RetryConfig {
    switch (operationType) {
      case 'auth':
        return {
          maxAttempts: 2,
          baseDelay: 500,
          maxDelay: 2000,
          backoffFactor: 2,
          jitter: false
        };
      case 'bucket':
        return {
          maxAttempts: 3,
          baseDelay: 1000,
          maxDelay: 5000,
          backoffFactor: 2,
          jitter: true
        };
      case 'object':
        return {
          maxAttempts: 3,
          baseDelay: 1500,
          maxDelay: 8000,
          backoffFactor: 2,
          jitter: true
        };
      case 'upload':
        return {
          maxAttempts: 5,
          baseDelay: 2000,
          maxDelay: 15000,
          backoffFactor: 1.5,
          jitter: true
        };
      default:
        return this.defaultConfig;
    }
  }
}
