
import React from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { BackendConsole } from '../components/BackendConsole';
import { BackendStatusIndicator } from '../components/BackendStatusIndicator';
import { useBackendStatus } from '../hooks/useBackendStatus';

export const Dashboard = () => {
  const { status, isChecking, checkStatus } = useBackendStatus();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="xl:col-span-3 space-y-6">
            <BackendStatusIndicator 
              status={status}
              isChecking={isChecking}
              onRetry={checkStatus}
            />
            <BucketList />
          </div>
          
          {/* Sidebar */}
          <div className="xl:col-span-1 space-y-4">
            <ActionHistory />
            <BackendConsole />
          </div>
        </div>
      </div>
    </div>
  );
};

// Add default export for compatibility
export default Dashboard;
