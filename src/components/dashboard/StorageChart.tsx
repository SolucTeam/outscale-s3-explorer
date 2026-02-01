import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useS3Store } from '@/hooks/useS3Store';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { HardDrive } from 'lucide-react';

const COLORS = [
  'hsl(221, 83%, 53%)',  // blue
  'hsl(142, 71%, 45%)',  // green
  'hsl(262, 83%, 58%)',  // purple
  'hsl(25, 95%, 53%)',   // orange
  'hsl(346, 77%, 49%)',  // rose
  'hsl(199, 89%, 48%)',  // cyan
  'hsl(47, 96%, 53%)',   // yellow
  'hsl(280, 65%, 60%)',  // violet
  'hsl(173, 80%, 40%)',  // teal
  'hsl(330, 80%, 60%)',  // pink
  'hsl(15, 90%, 55%)',   // coral
  'hsl(190, 75%, 45%)',  // sky blue
  'hsl(45, 85%, 50%)',   // amber
  'hsl(300, 60%, 50%)',  // magenta
  'hsl(160, 70%, 40%)',  // emerald
];

export const StorageChart = () => {
  const { buckets, loading } = useS3Store();

  const chartData = useMemo(() => {
    const bucketsWithSize = buckets
      .filter(b => (b.size || 0) > 0)
      .map(b => ({
        name: b.name,
        value: b.size || 0,
        formattedSize: formatBytes(b.size || 0)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    return bucketsWithSize;
  }, [buckets]);

  const totalSize = useMemo(() => {
    return buckets.reduce((sum, b) => sum + (b.size || 0), 0);
  }, [buckets]);

  function formatBytes(bytes: number) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3 animate-scale-in">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm text-muted-foreground">
            {payload[0].payload.formattedSize}
          </p>
          <p className="text-sm text-muted-foreground">
            {((payload[0].value / totalSize) * 100).toFixed(1)}% du total
          </p>
        </div>
      );
    }
    return null;
  };

  // Skeleton loading state
  if (loading && buckets.length === 0) {
    return (
      <Card className="border-0 shadow-sm animate-fade-in">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-40" />
          </div>
          <Skeleton className="h-4 w-24 mt-1" />
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center">
            <div className="relative">
              <Skeleton className="w-40 h-40 rounded-full" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Skeleton className="w-24 h-24 rounded-full bg-background" />
              </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="w-3 h-3 rounded" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="border-0 shadow-sm animate-fade-in">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-purple-500" />
            Utilisation du Stockage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <p>Aucune donnée de stockage disponible</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm animate-fade-in h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-purple-500" />
          Utilisation du Stockage
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Total: {formatBytes(totalSize)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => (
                  <span className="text-xs">{value.length > 15 ? value.slice(0, 15) + '...' : value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
