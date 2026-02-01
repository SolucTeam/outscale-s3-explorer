import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useS3Store } from '@/hooks/useS3Store';
import { Shield, Lock, GitBranch, KeyRound, AlertTriangle, CheckCircle2, Users } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export const SecurityAnalysis = () => {
  const { buckets } = useS3Store();

  const securityStats = useMemo(() => {
    const total = buckets.length;
    if (total === 0) return null;

    const withVersioning = buckets.filter(b => b.versioningEnabled).length;
    const withObjectLock = buckets.filter(b => b.objectLockEnabled).length;
    const withEncryption = buckets.filter(b => b.encryptionEnabled).length;
    const withCrossAccount = buckets.filter(b => b.hasCrossAccountAccess).length;
    
    // Calcul du score de sécurité (0-100)
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

  if (!securityStats) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" />
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

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 50) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const securityItems = [
    {
      icon: GitBranch,
      label: 'Versioning',
      count: securityStats.withVersioning,
      total: securityStats.total,
      percent: securityStats.versioningPercent,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: KeyRound,
      label: 'Chiffrement',
      count: securityStats.withEncryption,
      total: securityStats.total,
      percent: securityStats.encryptionPercent,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100'
    },
    {
      icon: Lock,
      label: 'Object Lock',
      count: securityStats.withObjectLock,
      total: securityStats.total,
      percent: securityStats.objectLockPercent,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100'
    }
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          Analyse de Sécurité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score global */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className={`text-3xl font-bold ${getScoreColor(securityStats.securityScore)}`}>
            {securityStats.securityScore}%
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Score de Sécurité</p>
            <Progress 
              value={securityStats.securityScore} 
              className="h-2 mt-1"
            />
          </div>
        </div>

        {/* Détails par fonctionnalité */}
        <div className="space-y-3">
          {securityItems.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg ${item.bgColor} flex items-center justify-center`}>
                <item.icon className={`w-4 h-4 ${item.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{item.label}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.count}/{item.total}
                  </span>
                </div>
                <Progress value={item.percent} className="h-1.5 mt-1" />
              </div>
              {item.percent === 100 ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : item.percent === 0 ? (
                <AlertTriangle className="w-4 h-4 text-red-500" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              )}
            </div>
          ))}
        </div>

        {/* Accès cross-account */}
        {securityStats.withCrossAccount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
            <Users className="w-4 h-4 text-amber-600" />
            <span className="text-sm text-amber-800">
              {securityStats.withCrossAccount} bucket{securityStats.withCrossAccount > 1 ? 's' : ''} avec accès cross-account
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
