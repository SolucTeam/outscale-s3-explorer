
import React from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { BackendConsole } from '../components/BackendConsole';
import { BackendStatusIndicator } from '../components/BackendStatusIndicator';

export const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Main content */}
          <div className="xl:col-span-3 space-y-6">
            <BackendStatusIndicator />
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
