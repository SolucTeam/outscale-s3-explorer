
import React from 'react';
import { BucketList } from '../components/BucketList';
import { BackendStatusIndicator } from '../components/BackendStatusIndicator';
import { useBackendStatus } from '../hooks/useBackendStatus';

export const Dashboard = () => {
  const { status, isChecking, checkStatus } = useBackendStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 pr-96"> {/* Padding right pour éviter le chevauchement avec la sidebar */}
        <div className="space-y-6">
          <BackendStatusIndicator 
            status={status}
            isChecking={isChecking}
            onRetry={checkStatus}
          />
          <BucketList />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
