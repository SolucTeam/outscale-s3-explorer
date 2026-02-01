
import React from 'react';
import { BucketList } from '../components/BucketList';
import { ActionHistory } from '../components/ActionHistory';
import { OperationStatusIndicator } from '../components/OperationStatusIndicator';
import { DashboardSettingsDialog } from '../components/DashboardSettingsDialog';
import { useDashboardSettings } from '../hooks/useDashboardSettings';
import { 
  StatsOverview, 
  StorageChart, 
  SecurityAnalysis, 
  PermissionsOverview 
} from '../components/dashboard';

const Dashboard = () => {
  const { widgets } = useDashboardSettings();
  
  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);
  const isVisible = (id: string) => sortedWidgets.find(w => w.id === id)?.visible ?? true;
  
  const widgetComponents: Record<string, React.ReactNode> = {
    storage: <StorageChart key="storage" />,
    security: <SecurityAnalysis key="security" />,
    permissions: <PermissionsOverview key="permissions" />,
  };

  const visibleRowWidgets = sortedWidgets
    .filter(w => ['storage', 'security', 'permissions'].includes(w.id) && w.visible)
    .map(w => widgetComponents[w.id]);
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header with settings */}
        <div className="flex justify-end mb-4">
          <DashboardSettingsDialog />
        </div>

        {/* Stats Overview - Full width */}
        {isVisible('stats') && (
          <div className="mb-6">
            <StatsOverview />
          </div>
        )}

        {/* Widgets row - dynamic based on visibility */}
        {visibleRowWidgets.length > 0 && (
          <div className={`grid gap-6 mb-6 ${
            visibleRowWidgets.length === 1 ? 'grid-cols-1' :
            visibleRowWidgets.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
          }`}>
            {visibleRowWidgets}
          </div>
        )}

        {/* Operation Status */}
        <div className="mb-6">
          <OperationStatusIndicator />
        </div>

        {/* Main content with sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Bucket List - 2/3 width */}
          <div className="xl:col-span-2">
            <BucketList />
          </div>
          
          {/* Action History Sidebar - 1/3 width */}
          <div className="xl:col-span-1">
            <ActionHistory />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
