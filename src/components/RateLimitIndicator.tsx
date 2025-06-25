
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle } from 'lucide-react';

interface RateLimitIndicatorProps {
  queueLength: number;
  className?: string;
}

export const RateLimitIndicator: React.FC<RateLimitIndicatorProps> = ({
  queueLength,
  className = ''
}) => {
  if (queueLength === 0) return null;

  return (
    <Alert className={`border-orange-200 bg-orange-50 ${className}`}>
      <Clock className="h-4 w-4 text-orange-600" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <span className="text-orange-800">
            Requêtes en attente pour éviter les limites de taux
          </span>
        </div>
        <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
          {queueLength} en queue
        </Badge>
      </AlertDescription>
    </Alert>
  );
};
