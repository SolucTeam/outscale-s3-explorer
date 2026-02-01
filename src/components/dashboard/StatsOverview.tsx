import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useS3Store } from '@/hooks/useS3Store';
import { Database, FolderOpen, HardDrive, TrendingUp } from 'lucide-react';

export const StatsOverview = () => {
  const { buckets } = useS3Store();

  const stats = useMemo(() => {
    const totalBuckets = buckets.length;
    const totalObjects = buckets.reduce((sum, b) => sum + (b.objectCount || 0), 0);
    const totalSize = buckets.reduce((sum, b) => sum + (b.size || 0), 0);
    const avgObjectsPerBucket = totalBuckets > 0 ? Math.round(totalObjects / totalBuckets) : 0;

    return { totalBuckets, totalObjects, totalSize, avgObjectsPerBucket };
  }, [buckets]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const statCards = [
    {
      title: 'Total Buckets',
      value: stats.totalBuckets,
      icon: Database,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Objets',
      value: stats.totalObjects.toLocaleString(),
      icon: FolderOpen,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600'
    },
    {
      title: 'Stockage Total',
      value: formatBytes(stats.totalSize),
      icon: HardDrive,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      title: 'Moy. Objets/Bucket',
      value: stats.avgObjectsPerBucket.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
