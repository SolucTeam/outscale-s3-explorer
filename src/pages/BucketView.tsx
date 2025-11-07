
import React, { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ObjectList } from '../components/ObjectList';
import { Breadcrumb } from '../components/Breadcrumb';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';
import { useS3Store } from '../hooks/useS3Store';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Lock } from 'lucide-react';

const BucketView = () => {
  const { name } = useParams<{ name: string }>();
  const { setCurrentBucket, setCurrentPath, currentBucket, buckets } = useS3Store();

  // Trouver le bucket actuel pour vérifier object lock
  const currentBucketInfo = useMemo(() => {
    return buckets.find(b => b.name === name);
  }, [buckets, name]);

  useEffect(() => {
    if (name && name !== currentBucket) {
      console.log('BucketView: Setting bucket and path', { name, currentBucket });
      setCurrentBucket(name);
      setCurrentPath('');
    }
  }, [name, setCurrentBucket, setCurrentPath, currentBucket]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        <div className="flex flex-col xl:flex-row gap-4 sm:gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <OperationStatusIndicator />
            
            {/* Bannière d'information Object Lock */}
            {currentBucketInfo?.objectLockEnabled && (
              <Alert className="bg-amber-50 border-amber-200">
                <Lock className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  <strong>Object Lock activé</strong> - Le versioning est obligatoire et ne peut pas être désactivé sur ce bucket.
                </AlertDescription>
              </Alert>
            )}
            
            <Breadcrumb />
            <ObjectList />
          </div>
          <div className="hidden xl:block w-80 flex-shrink-0">
            <ActionHistory />
          </div>
        </div>
        <div className="xl:hidden mt-8">
          <ActionHistory />
        </div>
      </main>
    </div>
  );
};

export default BucketView;
