
import React, { useEffect, useState } from 'react';
import { LoginForm } from '../components/LoginForm';
import { Header } from '../components/Header';
import { BucketList } from '../components/BucketList';
import { ObjectList } from '../components/ObjectList';
import { Breadcrumb } from '../components/Breadcrumb';
import { BackendStatusIndicator } from '../components/BackendStatusIndicator';
import { LogConsole } from '../components/LogConsole';
import { ActionHistory } from '../components/ActionHistory';
import { RetryIndicator } from '../components/RetryIndicator';
import { useS3Store } from '../hooks/useS3Store';
import { useBackendApi } from '../hooks/useBackendApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Index = () => {
  const { credentials, currentBucket } = useS3Store();
  const { fetchBuckets } = useBackendApi();
  const [activeTab, setActiveTab] = useState('buckets');

  useEffect(() => {
    if (credentials) {
      fetchBuckets();
    }
  }, [credentials, fetchBuckets]);

  if (!credentials) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">NumS3 Console</h1>
              <p className="text-gray-600">Gestionnaire S3 pour Outscale</p>
            </div>
            <LoginForm />
            <div className="mt-6">
              <BackendStatusIndicator />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <RetryIndicator />
      
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Contenu principal */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              <Breadcrumb />
              
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="buckets">Buckets</TabsTrigger>
                  <TabsTrigger value="objects" disabled={!currentBucket}>
                    Contenu
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="buckets" className="space-y-6">
                  <BucketList />
                </TabsContent>
                
                <TabsContent value="objects" className="space-y-6">
                  {currentBucket && <ObjectList />}
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Panneau latéral - Logs et historique */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              <LogConsole />
              <ActionHistory />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
