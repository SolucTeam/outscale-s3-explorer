
import React from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';
import { 
  StatsOverview, 
  StorageChart, 
  SecurityAnalysis, 
  PermissionsOverview 
} from '../components/dashboard';

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        {/* Stats Overview - Full width */}
        <div className="mb-6">
          <StatsOverview />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main content - 2/3 width */}
          <div className="xl:col-span-2 space-y-6">
            <OperationStatusIndicator />
            
            {/* Widgets row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StorageChart />
              <SecurityAnalysis />
            </div>

            {/* Permissions widget */}
            <PermissionsOverview />

            {/* Bucket List */}
            <BucketList />
          </div>
          
          {/* Sidebar - 1/3 width */}
          <div className="xl:col-span-1 space-y-4 pt-4">
            <ActionHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
