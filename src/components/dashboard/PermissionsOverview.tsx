import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useS3Store } from '@/hooks/useS3Store';
import { Users, Lock, Globe, ShieldCheck, ShieldAlert, Eye, UserCheck } from 'lucide-react';

interface BucketPermissionStatus {
  name: string;
  isPublic: boolean;
  hasVersioning: boolean;
  hasEncryption: boolean;
  hasObjectLock: boolean;
  hasCrossAccount: boolean;
  crossAccountCount: number;
}

export const PermissionsOverview = () => {
  const { buckets } = useS3Store();

  const permissionsData = useMemo(() => {
    const bucketStatuses: BucketPermissionStatus[] = buckets.map(b => ({
      name: b.name,
      isPublic: false, // Détecté via ACL dans le futur
      hasVersioning: b.versioningEnabled || false,
      hasEncryption: b.encryptionEnabled || false,
      hasObjectLock: b.objectLockEnabled || false,
      hasCrossAccount: b.hasCrossAccountAccess || false,
      crossAccountCount: b.crossAccountCount || 0
    }));

    const privateBuckets = bucketStatuses.filter(b => !b.isPublic && !b.hasCrossAccount);
    const crossAccountBuckets = bucketStatuses.filter(b => b.hasCrossAccount);
    const publicBuckets = bucketStatuses.filter(b => b.isPublic);

    return {
      bucketStatuses,
      privateBuckets,
      crossAccountBuckets,
      publicBuckets,
      total: buckets.length
    };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-500" />
            Permissions & ACL
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            <p>Aucun bucket à analyser</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const permissionCategories = [
    {
      icon: Lock,
      label: 'Buckets privés',
      count: permissionsData.privateBuckets.length,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
      badgeVariant: 'default' as const,
      description: 'Accès restreint au propriétaire'
    },
    {
      icon: UserCheck,
      label: 'Accès cross-account',
      count: permissionsData.crossAccountBuckets.length,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
      badgeVariant: 'secondary' as const,
      description: 'Partagés avec d\'autres comptes'
    },
    {
      icon: Globe,
      label: 'Buckets publics',
      count: permissionsData.publicBuckets.length,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      badgeVariant: 'destructive' as const,
      description: 'Accessibles publiquement'
    }
  ];

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          Permissions & ACL
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Résumé des permissions */}
        <div className="space-y-3">
          {permissionCategories.map((category, index) => (
            <div 
              key={index} 
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-lg ${category.bgColor} flex items-center justify-center`}>
                <category.icon className={`w-5 h-5 ${category.color}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{category.label}</span>
                  <Badge variant={category.badgeVariant}>
                    {category.count}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{category.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Liste des buckets avec cross-account */}
        {permissionsData.crossAccountBuckets.length > 0 && (
          <div className="pt-3 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Buckets avec accès partagé
            </p>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {permissionsData.crossAccountBuckets.slice(0, 5).map((bucket, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between text-sm p-2 bg-muted/30 rounded"
                >
                  <span className="truncate max-w-[150px]">{bucket.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {bucket.crossAccountCount} compte{bucket.crossAccountCount > 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
              {permissionsData.crossAccountBuckets.length > 5 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{permissionsData.crossAccountBuckets.length - 5} autres buckets
                </p>
              )}
            </div>
          </div>
        )}

        {/* Indicateur global */}
        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
          {permissionsData.publicBuckets.length === 0 ? (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-700">
                Aucun bucket public détecté
              </span>
            </>
          ) : (
            <>
              <ShieldAlert className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">
                {permissionsData.publicBuckets.length} bucket{permissionsData.publicBuckets.length > 1 ? 's' : ''} public{permissionsData.publicBuckets.length > 1 ? 's' : ''} à vérifier
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
