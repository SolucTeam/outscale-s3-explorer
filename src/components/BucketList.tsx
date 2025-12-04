import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { Folder, Calendar, HardDrive, ChevronRight, RefreshCw, Plus, Trash2, Cloud, GitBranch, Lock, Settings, Shield } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CreateBucketDialog } from './CreateBucketDialog';
import { ForceDeleteBucketDialog } from './ForceDeleteBucketDialog';
import { BucketSettingsDialog } from './BucketSettingsDialog';
import { BucketSecurityDialog } from './BucketSecurityDialog';
import { SearchFilter } from './SearchFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { S3Bucket } from '../types/s3';

export const BucketList = () => {
  const { buckets, loading, setCurrentBucket, setCurrentPath, setObjects } = useS3Store();
  const { fetchBuckets, initialized } = useEnhancedDirectS3();
  const navigate = useNavigate();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [showSecurityDialog, setShowSecurityDialog] = useState(false);
  const [bucketToDelete, setBucketToDelete] = useState<string>('');
  const [bucketToEdit, setBucketToEdit] = useState<S3Bucket | null>(null);
  const [bucketToView, setBucketToView] = useState<S3Bucket | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrer les buckets selon la recherche
  const filteredBuckets = useMemo(() => {
    if (!searchQuery.trim()) return buckets;
    const query = searchQuery.toLowerCase();
    return buckets.filter(bucket => 
      bucket.name.toLowerCase().includes(query) ||
      bucket.location?.toLowerCase().includes(query) ||
      bucket.region.toLowerCase().includes(query)
    );
  }, [buckets, searchQuery]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <Skeleton className="w-10 h-10 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-9 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Mes Buckets S3</h2>
          <p className="text-sm sm:text-base text-gray-600">Gérez vos espaces de stockage Outscale</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
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

      {/* Barre de recherche */}
      {buckets.length > 0 && (
        <div className="flex items-center gap-4">
          <SearchFilter
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher un bucket..."
          />
          {searchQuery && (
            <span className="text-sm text-muted-foreground">
              {filteredBuckets.length} résultat{filteredBuckets.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Afficher le message "aucun bucket" seulement si on a fini de charger ET qu'il n'y a vraiment aucun bucket */}
      {hasInitiallyLoaded && buckets.length === 0 && !loading ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
            <Cloud className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun bucket trouvé</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Vous n'avez pas encore de buckets S3. Créez votre premier bucket pour commencer à stocker vos fichiers dans le cloud.
          </p>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Créer mon premier bucket
          </Button>
        </div>
      ) : filteredBuckets.length === 0 && searchQuery ? (
        <div className="text-center py-12">
          <p className="text-gray-600">Aucun bucket ne correspond à "{searchQuery}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
          {filteredBuckets.map((bucket) => (
            <TooltipProvider key={bucket.name}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer group" onClick={() => handleBucketClick(bucket.name)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors flex-shrink-0">
                            <Folder className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <CardTitle className="text-sm sm:text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                              {bucket.name}
                            </CardTitle>
                            <div className="flex flex-wrap gap-1 mt-1 max-w-full">
                        <Badge variant="secondary" className="text-xs whitespace-nowrap">
                          {bucket.location || bucket.region}
                        </Badge>
                        {bucket.versioningEnabled && (
                          <Badge variant="versioning" className="text-xs flex items-center gap-1 whitespace-nowrap">
                            <GitBranch className="w-3 h-3" />
                            <span className="hidden sm:inline">Versioning</span>
                            <span className="sm:hidden">Ver</span>
                          </Badge>
                        )}
                        {bucket.objectLockEnabled && (
                          <Badge variant="lock" className="text-xs flex items-center gap-1 whitespace-nowrap">
                            <Lock className="w-3 h-3" />
                            <span>Lock</span>
                          </Badge>
                        )}
                        {bucket.encryptionEnabled && (
                          <Badge variant="encryption" className="text-xs flex items-center gap-1 whitespace-nowrap">
                            <Lock className="w-3 h-3" />
                            <span className="hidden sm:inline">Encryption</span>
                            <span className="sm:hidden">Enc</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleSecurityBucket(bucket, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8 p-0"
                      title="Sécurité et permissions"
                    >
                      <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleSettingsBucket(bucket, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-600 hover:text-gray-700 hover:bg-gray-100 h-8 w-8 p-0"
                      title="Paramètres du bucket"
                    >
                      <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => handleDeleteBucket(bucket.name, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                      title="Supprimer le bucket et son contenu"
                    >
                      <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </Button>
                    <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center space-x-2 text-gray-600 min-w-0">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">Créé {formatDistanceToNow(bucket.creationDate, { addSuffix: true, locale: fr })}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">
                    {bucket.hasMoreObjects ? '1000+' : (bucket.objectCount || 0)} objets
                  </span>
                  <div className="flex items-center space-x-2 text-gray-600">
                    <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>{formatBytes(bucket.size || 0)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full mt-4 text-sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleBucketClick(bucket.name);
                  }}
                  variant="outline"
                >
                  Parcourir
                  <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 ml-2" />
                </Button>
              </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="font-medium">{bucket.name}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      )}

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
    </div>
  );
};
