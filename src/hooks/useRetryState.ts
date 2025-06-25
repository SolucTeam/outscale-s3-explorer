
import { useState, useCallback } from 'react';
import { RetryService, RetryConfig } from '../services/retryService';
import { ErrorService, AppError } from '../services/errorService';

export interface UseRetryStateReturn {
  isLoading: boolean;
  isRetrying: boolean;
  error: AppError | null;
  retryAttempt: number;
  nextRetryIn: number;
  execute: <T>(operation: () => Promise<T>, config?: Partial<RetryConfig>) => Promise<T>;
  reset: () => void;
}

export const useRetryState = (): UseRetryStateReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [nextRetryIn, setNextRetryIn] = useState(0);

  const execute = useCallback(async <T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);
    setRetryAttempt(0);
    setNextRetryIn(0);

    try {
      const result = await RetryService.executeWithRetry(
        operation,
        config,
        (retryState) => {
          setIsRetrying(true);
          setRetryAttempt(retryState.attempt);
          setNextRetryIn(retryState.nextDelay);
          
          if (retryState.error) {
            setError(retryState.error);
          }
        }
      );

      setIsRetrying(false);
      return result;
    } catch (err) {
      const appError = ErrorService.parseError(err);
      setError(appError);
      setIsRetrying(false);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setIsLoading(false);
    setIsRetrying(false);
    setError(null);
    setRetryAttempt(0);
    setNextRetryIn(0);
  }, []);

  return {
    isLoading,
    isRetrying,
    error,
    retryAttempt,
    nextRetryIn,
    execute,
    reset
  };
};
