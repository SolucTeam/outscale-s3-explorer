import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useS3Store } from '@/hooks/useS3Store';
import { Shield, Lock, GitBranch, KeyRound, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { SecurityGauge } from './SecurityGauge';

export const SecurityAnalysis = () => {
  const { buckets, loading } = useS3Store();

  const securityStats = useMemo(() => {
    const total = buckets.length;
    if (total === 0) return null;

    const withVersioning = buckets.filter(b => b.versioningEnabled).length;
    const withObjectLock = buckets.filter(b => b.objectLockEnabled).length;
    const withEncryption = buckets.filter(b => b.encryptionEnabled).length;
    const withCrossAccount = buckets.filter(b => b.hasCrossAccountAccess).length;
    
    const versioningScore = (withVersioning / total) * 30;
    const encryptionScore = (withEncryption / total) * 40;
    const objectLockScore = (withObjectLock / total) * 30;
    const securityScore = Math.round(versioningScore + encryptionScore + objectLockScore);

    return {
      total,
      withVersioning,
      withObjectLock,
      withEncryption,
      withCrossAccount,
      securityScore,
      versioningPercent: Math.round((withVersioning / total) * 100),
      encryptionPercent: Math.round((withEncryption / total) * 100),
      objectLockPercent: Math.round((withObjectLock / total) * 100)
    };
  }, [buckets]);

  const securityItems = [
    {
      icon: GitBranch,
      label: 'Versioning',
      description: 'Protection contre les suppressions accidentelles'
    },
    {
      icon: KeyRound,
      label: 'Chiffrement',
      description: 'Données chiffrées au repos'
    },
    {
      icon: Lock,
      label: 'Object Lock',
      description: 'Protection contre les modifications'
    }
  ];

  // Skeleton loading state
  if (loading && buckets.length === 0) {
    return (
      <Card className="border-0 shadow-soft animate-fade-in h-full">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Skeleton className="w-5 h-5 rounded" />
            <Skeleton className="h-5 w-36" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center py-4">
            <Skeleton className="w-[120px] h-[70px] rounded-t-full" />
          </div>
          <div className="space-y-3">
            {[...Array(3)].map((_, index) => (
              <div key={index} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!securityStats) {
    return (
      <Card className="border-0 shadow-soft animate-fade-in h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Analyse de Sécurité
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            <p>Aucun bucket à analyser</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const securityItemsWithData = [
    {
      ...securityItems[0],
      count: securityStats.withVersioning,
      total: securityStats.total,
      percent: securityStats.versioningPercent,
    },
    {
      ...securityItems[1],
      count: securityStats.withEncryption,
      total: securityStats.total,
      percent: securityStats.encryptionPercent,
    },
    {
      ...securityItems[2],
      count: securityStats.withObjectLock,
      total: securityStats.total,
      percent: securityStats.objectLockPercent,
    }
  ];

  return (
    <Card className="border-0 shadow-soft animate-fade-in h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Analyse de Sécurité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animated Gauge */}
        <div className="flex justify-center py-2">
          <SecurityGauge score={securityStats.securityScore} />
        </div>

        {/* Security features breakdown */}
        <div className="space-y-3">
          {securityItemsWithData.map((item, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${(index + 1) * 150}ms` }}
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <item.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground font-mono">
                    {item.count}/{item.total}
                  </span>
                </div>
                <Progress 
                  value={item.percent} 
                  className="h-1.5"
                />
              </div>
              {item.percent === 100 ? (
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              ) : item.percent === 0 ? (
                <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Cross-account warning */}
        {securityStats.withCrossAccount > 0 && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20 animate-fade-in">
            <Users className="w-4 h-4 text-warning flex-shrink-0" />
            <span className="text-sm text-warning font-medium">
              {securityStats.withCrossAccount} bucket{securityStats.withCrossAccount > 1 ? 's' : ''} avec accès cross-account
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
