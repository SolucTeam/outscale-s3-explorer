
import React, { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { ObjectList } from '../components/ObjectList';
import { ActionHistory } from '../components/ActionHistory';
import { BackendStatusIndicator } from '../components/BackendStatusIndicator';
import { Breadcrumb } from '../components/Breadcrumb';
import { useS3Store } from '../hooks/useS3Store';
import { useBackendApi } from '../hooks/useBackendApi';
import { useBackendStatus } from '../hooks/useBackendStatus';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const BucketPage = () => {
  const { bucketName } = useParams<{ bucketName: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const path = searchParams.get('path') || '';
  
  const { setCurrentBucket, setCurrentPath } = useS3Store();
  const { fetchObjects } = useBackendApi();
  const { status, isChecking, checkStatus } = useBackendStatus();

  useEffect(() => {
    if (bucketName) {
      setCurrentBucket(bucketName);
      setCurrentPath(path);
      fetchObjects(bucketName, path);
    }
  }, [bucketName, path, setCurrentBucket, setCurrentPath, fetchObjects]);

  const handleBackToDashboard = () => {
    setCurrentBucket(null);
    setCurrentPath('');
    navigate('/dashboard');
  };

  if (!bucketName) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6 flex items-center space-x-4">
          <Button
            onClick={handleBackToDashboard}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au tableau de bord
          </Button>
          <Breadcrumb />
        </div>
        
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <ObjectList />
          </div>
          <div className="lg:w-80">
            <div className="hidden lg:block">
              <ActionHistory />
            </div>
          </div>
        </div>
        <div className="lg:hidden mt-6">
          <ActionHistory />
        </div>
        <BackendStatusIndicator 
          status={status} 
          isChecking={isChecking} 
          onRetry={checkStatus}
        />
      </main>
    </div>
  );
};
