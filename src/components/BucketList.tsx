import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Folder, ChevronRight, RefreshCw, Plus, Trash2, Cloud, GitBranch, Lock, Settings, Shield, Wrench, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CreateBucketDialog } from './CreateBucketDialog';
import { ForceDeleteBucketDialog } from './ForceDeleteBucketDialog';
import { BucketSettingsDialog } from './BucketSettingsDialog';
import { BucketSecurityDialog } from './BucketSecurityDialog';
import { BucketAdvancedSettingsDialog } from './BucketAdvancedSettingsDialog';
import { SearchFilter } from './SearchFilter';
import { BucketFilters, BucketFiltersState, getDefaultFilters } from './BucketFilters';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { S3Bucket } from '../types/s3';

// Size thresholds in bytes
const SIZE_1GB = 1024 * 1024 * 1024;
const SIZE_10GB = 10 * SIZE_1GB;

export const BucketList = () => {
  const { buckets, loading, setCurrentBucket, setCurrentPath, setObjects } = useS3Store();
  const { fetchBuckets, initialized } = useEnhancedDirectS3();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [showAdvancedDialog, setShowAdvancedDialog] = useState(false);
  
  const [bucketToDelete, setBucketToDelete] = useState<string>('');
  const [bucketToEdit, setBucketToEdit] = useState<S3Bucket | null>(null);
  const [bucketToView, setBucketToView] = useState<S3Bucket | null>(null);
  const [bucketToAdvanced, setBucketToAdvanced] = useState<S3Bucket | null>(null);
  
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BucketFiltersState>(getDefaultFilters());

  // Extract unique regions from buckets
  const availableRegions = useMemo(() => {
    const regions = new Set<string>();
    buckets.forEach((bucket) => {
      regions.add(bucket.location || bucket.region);
    });
    return Array.from(regions).sort();
  }, [buckets]);

  // Filter buckets based on search and advanced filters
  const filteredBuckets = useMemo(() => {
    return buckets.filter((bucket) => {
      // Text search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          bucket.name.toLowerCase().includes(query) ||
          bucket.location?.toLowerCase().includes(query) ||
          bucket.region.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Region filter
      if (filters.regions.length > 0) {
        const bucketRegion = bucket.location || bucket.region;
        if (!filters.regions.includes(bucketRegion)) return false;
      }

      // Size filter
      const size = bucket.size || 0;
      switch (filters.sizeRange) {
        case 'empty':
          if (size > 0) return false;
          break;
        case 'small':
          if (size >= SIZE_1GB) return false;
          break;
        case 'medium':
          if (size < SIZE_1GB || size >= SIZE_10GB) return false;
          break;
        case 'large':
          if (size < SIZE_10GB) return false;
          break;
      }

      // Date filter
      if (filters.dateFrom && bucket.creationDate < filters.dateFrom) return false;
      if (filters.dateTo) {
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (bucket.creationDate > endOfDay) return false;
      }

      // Security filters
      const { versioning, objectLock, encryption, crossAccount } = filters.securityStatus;
      if (versioning !== null && bucket.versioningEnabled !== versioning) return false;
      if (objectLock !== null && bucket.objectLockEnabled !== objectLock) return false;
      if (encryption !== null && bucket.encryptionEnabled !== encryption) return false;
      if (crossAccount !== null && bucket.hasCrossAccountAccess !== crossAccount) return false;

      return true;
    });
  }, [buckets, searchQuery, filters]);

  useEffect(() => {
    if (!initialized) return;
    
    // Réinitialiser l'état quand on arrive sur la liste des buckets
    setCurrentBucket(null);
    setCurrentPath('');
    setObjects([]);
    
    // Charger les buckets avec un indicateur de première charge
    const loadBuckets = async () => {
      await fetchBuckets();
      setHasInitiallyLoaded(true);
    };
    
    loadBuckets();
  }, [initialized, fetchBuckets, setCurrentBucket, setCurrentPath, setObjects]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleDeleteBucket = (bucketName: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setBucketToDelete(bucketName);
    setShowDeleteDialog(true);
  };

  const handleDeleteCompleted = () => {
    fetchBuckets();
    setBucketToDelete('');
  };

  const handleSettingsBucket = (bucket: S3Bucket, event: React.MouseEvent) => {
    event.stopPropagation();
    setBucketToEdit(bucket);
    setShowSettingsDialog(true);
  };

  const handleSettingsUpdated = () => {
    fetchBuckets(true);
  };

  const handleSecurityBucket = (bucket: S3Bucket, event: React.MouseEvent) => {
    event.stopPropagation();
    setBucketToView(bucket);
    setShowSecurityDialog(true);
  };

  const handleAdvancedBucket = (bucket: S3Bucket, event: React.MouseEvent) => {
    event.stopPropagation();
    setBucketToAdvanced(bucket);
    setShowAdvancedDialog(true);
  };

  const handleShareBucket = (bucket: S3Bucket, event: React.MouseEvent) => {
    event.stopPropagation();
    setBucketToView(bucket);
    setShowSecurityDialog(true);
  };

  const handleRefresh = async () => {
    console.log('🔄 Actualisation des buckets demandée');
    await fetchBuckets(true); // Force refresh
  };

  const handleBucketClick = (bucketName: string) => {
    console.log(`Accès au bucket: ${bucketName}`);
    navigate(`/bucket/${bucketName}`);
  };

  if (loading && !hasInitiallyLoaded) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mes Buckets S3</h2>
            <p className="text-sm sm:text-base text-gray-600">Gérez vos espaces de stockage Outscale</p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>

        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Helper function to get region badge class
  const getRegionBadgeClass = (region: string) => {
    const r = region.toLowerCase();
    if (r === 'eu-west-2' || r.includes('paris')) return 'region-badge--eu-west-2';
    if (r === 'eu-west-1' || r === 'eu-central-1' || r.includes('frankfurt') || r.includes('ireland')) return 'region-badge--eu-central';
    if (r.includes('site1') || r.includes('site2') || r.includes('site3')) return 'region-badge--site';
    if (r.includes('us-east')) return 'region-badge--us-east';
    if (r.includes('us-west')) return 'region-badge--us-west';
    if (r.includes('ap-') || r.includes('asia') || r.includes('tokyo')) return 'region-badge--ap';
    if (r.includes('gov') || r.includes('cloudgouv')) return 'region-badge--gov';
    if (r.includes('eu-') || r.includes('europe')) return 'region-badge--eu';
    if (r.includes('us-') || r.includes('america')) return 'region-badge--us';
    return 'region-badge--default';
  };


  const renderListView = () => (
    <div className="space-y-2">
      {filteredBuckets.map((bucket, index) => (
        <TooltipProvider key={bucket.name}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Card 
                className="bucket-row cursor-pointer border-0 shadow-soft animate-fade-in" 
                onClick={() => handleBucketClick(bucket.name)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1 min-w-0">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110">
                        <Folder className="w-5 h-5 text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h4 className="font-medium text-foreground hover:text-primary transition-colors truncate max-w-md">
                            {bucket.name}
                          </h4>
                          <Badge 
                            variant="secondary" 
                            className={`text-xs font-medium ${getRegionBadgeClass(bucket.location || bucket.region)}`}
                          >
                            {bucket.location || bucket.region}
                          </Badge>
                          {bucket.versioningEnabled && (
                            <Badge variant="versioning" className="text-xs flex items-center gap-1">
                              <GitBranch className="w-3 h-3" />
                              Versioning
                            </Badge>
                          )}
                          {bucket.objectLockEnabled && (
                            <Badge variant="lock" className="text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Lock
                            </Badge>
                          )}
                          {bucket.encryptionEnabled && (
                            <Badge variant="encryption" className="text-xs flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Encryption
                            </Badge>
                          )}
                          {bucket.hasCrossAccountAccess && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1 text-success border-success/30 bg-success/10">
                              <Users className="w-3 h-3" />
                              Cross-Account
                              {bucket.crossAccountCount && bucket.crossAccountCount > 1 && (
                                <span className="ml-0.5">({bucket.crossAccountCount})</span>
                              )}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <span className="font-mono">{bucket.hasMoreObjects ? '1000+' : (bucket.objectCount || 0)} objets</span>
                          <span className="font-mono">{formatBytes(bucket.size || 0)}</span>
                          <span>
                            Créé {formatDistanceToNow(bucket.creationDate, { addSuffix: true, locale: fr })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleSecurityBucket(bucket, e)}
                        className="h-8 w-8 p-0 text-primary hover:text-primary hover:bg-primary/10"
                        title="Sécurité et permissions"
                      >
                        <Shield className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleSettingsBucket(bucket, e)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground hover:bg-accent"
                        title="Paramètres"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleAdvancedBucket(bucket, e)}
                        className="h-8 w-8 p-0 text-info hover:text-info hover:bg-info/10"
                        title="Paramètres avancés"
                      >
                        <Wrench className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => handleDeleteBucket(bucket.name, e)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-md">
              <p className="font-medium break-all">{bucket.name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground">Mes Buckets S3</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Gérez vos espaces de stockage Outscale</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Nouveau bucket
          </Button>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Barre de recherche et filtres */}
      {buckets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <SearchFilter
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Rechercher un bucket..."
            />
            {(searchQuery || filters.regions.length > 0 || filters.sizeRange !== 'all' || filters.dateFrom || filters.dateTo) && (
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredBuckets.length} résultat{filteredBuckets.length > 1 ? 's' : ''} sur {buckets.length}
              </span>
            )}
          </div>
          <BucketFilters 
            filters={filters} 
            onFiltersChange={setFilters} 
            availableRegions={availableRegions}
          />
        </div>
      )}

      {/* Afficher le message "aucun bucket" seulement si on a fini de charger ET qu'il n'y a vraiment aucun bucket */}
      {hasInitiallyLoaded && buckets.length === 0 && !loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <Cloud className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Aucun bucket trouvé</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Vous n'avez pas encore de buckets S3. Créez votre premier bucket pour commencer à stocker vos fichiers dans le cloud.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Créer mon premier bucket
          </Button>
        </div>
      ) : filteredBuckets.length === 0 && (searchQuery || filters.regions.length > 0) ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Aucun bucket ne correspond aux critères de recherche</p>
          <Button variant="link" onClick={() => { setSearchQuery(''); setFilters(getDefaultFilters()); }}>
            Effacer les filtres
          </Button>
        </div>
      ) : renderListView()}

      {/* Indicateur de chargement lors des rafraîchissements */}
      {loading && hasInitiallyLoaded && (
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center space-x-2 text-blue-600">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm">Actualisation en cours...</span>
          </div>
        </div>
      )}

      <CreateBucketDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog}
      />

      <ForceDeleteBucketDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        bucketName={bucketToDelete}
        onDeleted={handleDeleteCompleted}
      />

      {bucketToEdit && (
        <BucketSettingsDialog
          open={showSettingsDialog}
          onOpenChange={setShowSettingsDialog}
          bucket={bucketToEdit}
          onSettingsUpdated={handleSettingsUpdated}
        />
      )}

      {bucketToView && (
        <BucketSecurityDialog
          open={showSecurityDialog}
          onOpenChange={setShowSecurityDialog}
          bucket={bucketToView}
        />
      )}

      {bucketToAdvanced && (
        <BucketAdvancedSettingsDialog
          open={showAdvancedDialog}
          onOpenChange={setShowAdvancedDialog}
          bucket={bucketToAdvanced}
          onSettingsUpdated={handleSettingsUpdated}
        />
      )}

    </div>
  );
};