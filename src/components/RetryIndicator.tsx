
import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, AlertCircle, Clock } from 'lucide-react';
import { AppError } from '../services/errorService';

interface RetryIndicatorProps {
  isRetrying: boolean;
  error: AppError | null;
  retryAttempt: number;
  nextRetryIn: number;
  onManualRetry?: () => void;
  className?: string;
}

export const RetryIndicator: React.FC<RetryIndicatorProps> = ({
  isRetrying,
  error,
  retryAttempt,
  nextRetryIn,
  onManualRetry,
  className = ''
}) => {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (isRetrying && nextRetryIn > 0) {
      setCountdown(Math.ceil(nextRetryIn / 1000));
      
      const interval = setInterval(() => {
        setCountdown(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            clearInterval(interval);
            return 0;
          }
          return newValue;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isRetrying, nextRetryIn]);

  if (!error && !isRetrying) return null;

  return (
    <div className={`space-y-3 ${className}`}>
      {error && (
        <Alert variant={error.canRetry ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{error.userMessage}</p>
              {error.action && (
                <p className="text-sm text-gray-600">{error.action}</p>
              )}
              {error.canRetry && onManualRetry && !isRetrying && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={onManualRetry}
                  className="mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Réessayer maintenant
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isRetrying && (
        <Alert>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  Nouvelle tentative ({retryAttempt})...
                </span>
                {countdown > 0 && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{countdown}s</span>
                  </div>
                )}
              </div>
              {countdown > 0 && (
                <Progress 
                  value={((nextRetryIn / 1000 - countdown) / (nextRetryIn / 1000)) * 100} 
                  className="h-2"
                />
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
