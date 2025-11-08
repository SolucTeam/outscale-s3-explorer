import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnhancedDirectS3 } from '@/hooks/useEnhancedDirectS3';
import { Clock, Lock, Tag, History, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ObjectDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  objectKey: string;
  object: any;
}

export const ObjectDetailsDialog: React.FC<ObjectDetailsDialogProps> = ({
  open,
  onOpenChange,
  bucket,
  objectKey,
  object
}) => {
  const { listObjectVersions, getObjectRetention, getObjectLockConfiguration } = useEnhancedDirectS3();
  const [versions, setVersions] = useState<any[]>([]);
  const [retention, setRetention] = useState<any>(null);
  const [objectLockConfig, setObjectLockConfig] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadDetails = async () => {
    setLoading(true);
    try {
      // Charger les versions
      const versionsData = await listObjectVersions(bucket, objectKey);
      if (versionsData) {
        setVersions(versionsData);
      }

      // Charger la rétention
      const retentionData = await getObjectRetention(bucket, objectKey);
      if (retentionData) {
        setRetention(retentionData);
      }

      // Charger la configuration Object Lock
      const lockConfig = await getObjectLockConfiguration(bucket);
      if (lockConfig) {
        setObjectLockConfig(lockConfig);
      }
    } catch (error) {
      console.error('Error loading object details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDetails();
    }
  }, [open, bucket, objectKey]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails de l'objet</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadDetails}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Informations générales</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nom:</span>
                <span className="font-medium">{objectKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taille:</span>
                <span className="font-medium">{formatBytes(object.size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière modification:</span>
                <span className="font-medium">
                  {formatDistanceToNow(object.lastModified, { addSuffix: true, locale: fr })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classe de stockage:</span>
                <Badge variant="secondary">{object.storageClass}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">ETag:</span>
                <span className="font-mono text-xs">{object.etag}</span>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="versions" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="versions">
                <History className="w-4 h-4 mr-2" />
                Versions
              </TabsTrigger>
              <TabsTrigger value="retention">
                <Lock className="w-4 h-4 mr-2" />
                Rétention
              </TabsTrigger>
              <TabsTrigger value="tags">
                <Tag className="w-4 h-4 mr-2" />
                Tags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="versions" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Versions de l'objet</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : versions.length > 0 ? (
                    <div className="space-y-2">
                      {versions.map((version) => (
                        <div
                          key={version.versionId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{version.versionId}</span>
                              {version.isLatest && (
                                <Badge variant="default" className="text-xs">Actuelle</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatBytes(version.size)} • {formatDistanceToNow(version.lastModified, { addSuffix: true, locale: fr })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucune version disponible. Le versioning n'est peut-être pas activé.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="retention" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Configuration de rétention</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      {objectLockConfig && (
                        <div className="mb-4 p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Lock className="w-4 h-4" />
                            <span className="font-medium text-sm">Configuration du bucket</span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Object Lock:</span>
                              <Badge variant={objectLockConfig.enabled ? "default" : "secondary"}>
                                {objectLockConfig.enabled ? "Activé" : "Désactivé"}
                              </Badge>
                            </div>
                            {objectLockConfig.rule?.defaultRetention && (
                              <>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Mode par défaut:</span>
                                  <Badge variant="outline">
                                    {objectLockConfig.rule.defaultRetention.mode}
                                  </Badge>
                                </div>
                                {objectLockConfig.rule.defaultRetention.days && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground">Durée par défaut:</span>
                                    <span>{objectLockConfig.rule.defaultRetention.days} jours</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {retention && (retention.mode || retention.retainUntilDate) ? (
                        <div className="space-y-2 text-sm">
                          {retention.mode && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Mode:</span>
                              <Badge variant="outline">{retention.mode}</Badge>
                            </div>
                          )}
                          {retention.retainUntilDate && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Conserver jusqu'au:</span>
                              <span className="font-medium">
                                {new Date(retention.retainUntilDate).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune rétention configurée pour cet objet.
                        </p>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tags" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Tags de l'objet</CardTitle>
                </CardHeader>
                <CardContent>
                  {object.tags && Object.keys(object.tags).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(object.tags).map(([key, value]) => (
                        <Badge key={key} variant="outline">
                          <Tag className="w-3 h-3 mr-1" />
                          {key}: {value as string}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Aucun tag défini pour cet objet.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};
