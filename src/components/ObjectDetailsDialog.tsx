import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEnhancedDirectS3 } from '@/hooks/useEnhancedDirectS3';
import { Clock, Lock, Tag, History, RefreshCw, Shield, Link as LinkIcon, Copy, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

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
  const { listObjectVersions, getObjectRetention, getObjectLockConfiguration, getObjectAcl, getPresignedUrl } = useEnhancedDirectS3();
  const { toast } = useToast();
  const [versions, setVersions] = useState<any[]>([]);
  const [retention, setRetention] = useState<any>(null);
  const [objectLockConfig, setObjectLockConfig] = useState<any>(null);
  const [acl, setAcl] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [presignedUrl, setPresignedUrl] = useState<string>('');
  const [expiresIn, setExpiresIn] = useState<number>(3600);
  const [generatingUrl, setGeneratingUrl] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

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

      // Charger les ACL
      const aclData = await getObjectAcl(bucket, objectKey);
      if (aclData) {
        setAcl(aclData);
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

  const generatePresignedUrl = async () => {
    setGeneratingUrl(true);
    try {
      const url = await getPresignedUrl(bucket, objectKey, expiresIn);
      if (url) {
        setPresignedUrl(url);
        toast({
          title: "Succès",
          description: "URL pré-signée générée avec succès"
        });
      }
    } catch (error) {
      console.error('Error generating presigned URL:', error);
    } finally {
      setGeneratingUrl(false);
    }
  };

  const copyUrlToClipboard = () => {
    if (presignedUrl) {
      navigator.clipboard.writeText(presignedUrl);
      setUrlCopied(true);
      toast({
        title: "Copié",
        description: "URL copiée dans le presse-papier"
      });
      setTimeout(() => setUrlCopied(false), 2000);
    }
  };

  const formatExpiresIn = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0) parts.push(`${secs}s`);
    
    return parts.join(' ') || '0s';
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
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Nom:</span>
                <span className="font-medium text-right break-all max-w-[70%]">{objectKey}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taille:</span>
                <span className="font-medium">{formatBytes(object?.size || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dernière modification:</span>
                <span className="font-medium">
                  {object?.lastModified ? formatDistanceToNow(new Date(object.lastModified), { addSuffix: true, locale: fr }) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Classe de stockage:</span>
                <Badge variant="secondary">{object?.storageClass || 'STANDARD'}</Badge>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">ETag:</span>
                <span className="font-mono text-xs break-all max-w-[70%] text-right">{object?.etag || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="versions" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
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
              <TabsTrigger value="acl">
                <Shield className="w-4 h-4 mr-2" />
                ACL
              </TabsTrigger>
              <TabsTrigger value="presigned">
                <LinkIcon className="w-4 h-4 mr-2" />
                URL
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
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <ScrollArea className="max-w-full">
                                <span className="font-mono text-xs break-all">{version.versionId}</span>
                              </ScrollArea>
                              {version.isLatest && (
                                <Badge variant="default" className="text-xs flex-shrink-0">Actuelle</Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {formatBytes(version.size)} • {formatDistanceToNow(new Date(version.lastModified), { addSuffix: true, locale: fr })}
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
                  {object?.tags && Object.keys(object.tags).length > 0 ? (
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

            <TabsContent value="acl" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Contrôle d'accès (ACL)</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : acl ? (
                    <div className="space-y-4">
                      {acl.owner && (
                        <div className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Shield className="w-4 h-4" />
                            <span className="font-medium text-sm">Propriétaire</span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Nom:</span>
                              <span>{acl.owner.displayName || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">ID:</span>
                              <span className="font-mono text-xs break-all">{acl.owner.id}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {acl.grants && acl.grants.length > 0 ? (
                        <div className="space-y-2">
                          <span className="text-sm font-medium">Autorisations</span>
                          {acl.grants.map((grant: any, index: number) => (
                            <div key={index} className="p-3 border rounded-lg">
                              <div className="space-y-1 text-xs">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Bénéficiaire:</span>
                                  <span>{grant.grantee?.displayName || grant.grantee?.uri || grant.grantee?.id || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Type:</span>
                                  <Badge variant="outline" className="text-xs">{grant.grantee?.type || 'N/A'}</Badge>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Permission:</span>
                                  <Badge variant="secondary" className="text-xs">{grant.permission}</Badge>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Aucune autorisation spécifique définie.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Impossible de charger les ACL.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="presigned" className="space-y-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <LinkIcon className="w-4 h-4" />
                    Générer une URL pré-signée
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="expiresIn">Durée de validité</Label>
                    <div className="flex gap-2">
                      <Input
                        id="expiresIn"
                        type="number"
                        min="60"
                        max="604800"
                        value={expiresIn}
                        onChange={(e) => setExpiresIn(parseInt(e.target.value) || 3600)}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="px-3 py-2">
                        {formatExpiresIn(expiresIn)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Entre 60 secondes et 604800 secondes (1 semaine)
                    </p>
                  </div>

                  <Button
                    onClick={generatePresignedUrl}
                    disabled={generatingUrl || expiresIn < 60 || expiresIn > 604800}
                    className="w-full"
                  >
                    {generatingUrl ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Génération...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Générer l'URL
                      </>
                    )}
                  </Button>

                  {presignedUrl && (
                    <div className="space-y-2">
                      <Label>URL générée</Label>
                      <div className="flex gap-2">
                        <Input
                          value={presignedUrl}
                          readOnly
                          className="font-mono text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={copyUrlToClipboard}
                        >
                          {urlCopied ? (
                            <Check className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Cette URL expirera dans {formatExpiresIn(expiresIn)}
                      </p>
                    </div>
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
