import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Globe, FileText, Shield, RefreshCw, Plus, Trash2, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proxyS3Service } from '@/services/proxyS3Service';
import { S3Bucket } from '@/types/s3';

interface BucketAdvancedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: S3Bucket;
  onSettingsUpdated?: () => void;
}

interface CorsRule {
  AllowedOrigins: string[];
  AllowedMethods: string[];
  AllowedHeaders?: string[];
  ExposeHeaders?: string[];
  MaxAgeSeconds?: number;
}

export const BucketAdvancedSettingsDialog: React.FC<BucketAdvancedSettingsDialogProps> = ({
  open,
  onOpenChange,
  bucket,
  onSettingsUpdated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // CORS state
  const [corsRules, setCorsRules] = useState<CorsRule[]>([]);
  const [newCorsOrigin, setNewCorsOrigin] = useState('*');
  const [newCorsMethods, setNewCorsMethods] = useState<string[]>(['GET']);

  // Policy state
  const [policy, setPolicy] = useState<string>('');

  // Website state
  const [websiteEnabled, setWebsiteEnabled] = useState(false);
  const [indexDocument, setIndexDocument] = useState('index.html');
  const [errorDocument, setErrorDocument] = useState('error.html');

  // ACL state
  const [bucketAcl, setBucketAcl] = useState<string>('private');
  const [currentAcl, setCurrentAcl] = useState<{
    owner?: { id: string; displayName?: string };
    grants: Array<{ grantee: string; permission: string; type: string }>;
  } | null>(null);

  // Object Lock state
  const [objectLockMode, setObjectLockMode] = useState<'COMPLIANCE' | ''>('');
  const [objectLockDays, setObjectLockDays] = useState<number>(0);
  const [currentObjectLockConfig, setCurrentObjectLockConfig] = useState<{
    enabled: boolean;
    mode?: string;
    days?: number;
    years?: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      loadBucketSettings();
    }
  }, [open, bucket.name]);

  const loadBucketSettings = async () => {
    setLoading(true);
    try {
      // Load CORS
      const corsResponse = await proxyS3Service.getBucketCors(bucket.name);
      if (corsResponse.success && corsResponse.data?.corsRules) {
        setCorsRules(corsResponse.data.corsRules);
      }

      // Load Policy
      const policyResponse = await proxyS3Service.getBucketPolicy(bucket.name);
      if (policyResponse.success && policyResponse.data?.policy) {
        setPolicy(policyResponse.data.policy);
      }

      // Load Website
      const websiteResponse = await proxyS3Service.getBucketWebsite(bucket.name);
      if (websiteResponse.success && websiteResponse.data) {
        if (websiteResponse.data.indexDocument) {
          setWebsiteEnabled(true);
          setIndexDocument(websiteResponse.data.indexDocument);
          if (websiteResponse.data.errorDocument) {
            setErrorDocument(websiteResponse.data.errorDocument);
          }
        }
      }

      // Load ACL
      const aclResponse = await proxyS3Service.getBucketAcl(bucket.name);
      if (aclResponse.success && aclResponse.data) {
        const aclData = aclResponse.data;
        const grants = aclData.grants?.map(grant => ({
          grantee: grant.grantee?.displayName || grant.grantee?.id || grant.grantee?.uri || 'Inconnu',
          permission: grant.permission || 'UNKNOWN',
          type: grant.grantee?.type || 'Unknown'
        })) || [];
        
        setCurrentAcl({
          owner: aclData.owner ? {
            id: aclData.owner.id || '',
            displayName: aclData.owner.displayName
          } : undefined,
          grants
        });
      }

      // Load Object Lock configuration if enabled
      if (bucket.objectLockEnabled) {
        const lockResponse = await proxyS3Service.getObjectLockConfiguration(bucket.name);
        if (lockResponse.success && lockResponse.data) {
          const config = lockResponse.data;
          setCurrentObjectLockConfig({
            enabled: config.enabled || false,
            mode: config.rule?.defaultRetention?.mode,
            days: config.rule?.defaultRetention?.days,
            years: config.rule?.defaultRetention?.years
          });
          // Pre-fill form with current values
          if (config.rule?.defaultRetention?.mode) {
            setObjectLockMode(config.rule.defaultRetention.mode as 'COMPLIANCE');
          }
          if (config.rule?.defaultRetention?.days) {
            setObjectLockDays(config.rule.defaultRetention.days);
          } else if (config.rule?.defaultRetention?.years) {
            setObjectLockDays(config.rule.defaultRetention.years * 365);
          }
        }
      }
    } catch (error) {
      console.error('Error loading bucket settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCorsRule = () => {
    setCorsRules([...corsRules, {
      AllowedOrigins: [newCorsOrigin],
      AllowedMethods: newCorsMethods,
      AllowedHeaders: ['*'],
      MaxAgeSeconds: 3000
    }]);
    setNewCorsOrigin('*');
    setNewCorsMethods(['GET']);
  };

  const handleRemoveCorsRule = (index: number) => {
    setCorsRules(corsRules.filter((_, i) => i !== index));
  };

  const handleSaveCors = async () => {
    setSaving(true);
    try {
      if (corsRules.length === 0) {
        const response = await proxyS3Service.deleteBucketCors(bucket.name);
        if (response.success) {
          toast({ title: "Succès", description: "Configuration CORS supprimée" });
          onSettingsUpdated?.();
        }
      } else {
        const response = await proxyS3Service.setBucketCors(bucket.name, corsRules);
        if (response.success) {
          toast({ title: "Succès", description: "Configuration CORS mise à jour" });
          onSettingsUpdated?.();
        } else {
          throw new Error(response.error);
        }
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour CORS", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePolicy = async () => {
    setSaving(true);
    try {
      if (!policy.trim()) {
        const response = await proxyS3Service.deleteBucketPolicy(bucket.name);
        if (response.success) {
          toast({ title: "Succès", description: "Policy supprimée" });
          onSettingsUpdated?.();
        }
      } else {
        // Validate JSON
        try {
          JSON.parse(policy);
        } catch {
          toast({ title: "Erreur", description: "Policy JSON invalide", variant: "destructive" });
          setSaving(false);
          return;
        }
        const response = await proxyS3Service.setBucketPolicy(bucket.name, policy);
        if (response.success) {
          toast({ title: "Succès", description: "Policy mise à jour" });
          onSettingsUpdated?.();
        } else {
          throw new Error(response.error);
        }
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour la policy", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWebsite = async () => {
    setSaving(true);
    try {
      if (!websiteEnabled) {
        const response = await proxyS3Service.deleteBucketWebsite(bucket.name);
        if (response.success) {
          toast({ title: "Succès", description: "Configuration website supprimée" });
          onSettingsUpdated?.();
        }
      } else {
        const response = await proxyS3Service.setBucketWebsite(bucket.name, indexDocument, errorDocument);
        if (response.success) {
          toast({ title: "Succès", description: "Configuration website mise à jour" });
          onSettingsUpdated?.();
        } else {
          throw new Error(response.error);
        }
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de configurer le website", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAcl = async () => {
    setSaving(true);
    try {
      const response = await proxyS3Service.setBucketAcl(bucket.name, bucketAcl);
      if (response.success) {
        toast({ title: "Succès", description: "ACL du bucket mise à jour" });
        onSettingsUpdated?.();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour les ACL", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveObjectLock = async () => {
    if (!objectLockMode || objectLockDays <= 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un mode et une durée", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const response = await proxyS3Service.setBucketObjectLock(bucket.name, objectLockMode, objectLockDays);
      if (response.success) {
        toast({ title: "Succès", description: "Configuration Object Lock mise à jour" });
        onSettingsUpdated?.();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de configurer Object Lock. Vérifiez que Object Lock est activé à la création du bucket.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Paramètres avancés - {bucket.name}</span>
            <Button variant="outline" size="sm" onClick={loadBucketSettings} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cors" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="cors">
              <Globe className="w-4 h-4 mr-2" />
              CORS
            </TabsTrigger>
            <TabsTrigger value="policy">
              <FileText className="w-4 h-4 mr-2" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="website">
              <Globe className="w-4 h-4 mr-2" />
              Website
            </TabsTrigger>
            <TabsTrigger value="acl">
              <Shield className="w-4 h-4 mr-2" />
              ACL
            </TabsTrigger>
            <TabsTrigger value="lock">
              <Lock className="w-4 h-4 mr-2" />
              Object Lock
            </TabsTrigger>
          </TabsList>

          {/* CORS Tab */}
          <TabsContent value="cors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configuration CORS</CardTitle>
                <CardDescription>Autorisez les requêtes cross-origin vers ce bucket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing rules */}
                {corsRules.length > 0 && (
                  <div className="space-y-2">
                    {corsRules.map((rule, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <div className="flex gap-2 flex-wrap">
                            {rule.AllowedOrigins.map((origin) => (
                              <Badge key={origin} variant="outline">{origin}</Badge>
                            ))}
                          </div>
                          <div className="flex gap-1 mt-1">
                            {rule.AllowedMethods.map((method) => (
                              <Badge key={method} variant="secondary" className="text-xs">{method}</Badge>
                            ))}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleRemoveCorsRule(index)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new rule */}
                <div className="space-y-2 p-3 border rounded-lg bg-muted/50">
                  <Label>Nouvelle règle CORS</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Origin (ex: * ou https://example.com)"
                      value={newCorsOrigin}
                      onChange={(e) => setNewCorsOrigin(e.target.value)}
                    />
                    <Select
                      value={newCorsMethods.join(',')}
                      onValueChange={(v) => setNewCorsMethods(v.split(','))}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="GET">GET</SelectItem>
                        <SelectItem value="GET,PUT">GET, PUT</SelectItem>
                        <SelectItem value="GET,PUT,POST">GET, PUT, POST</SelectItem>
                        <SelectItem value="GET,PUT,POST,DELETE">GET, PUT, POST, DELETE</SelectItem>
                        <SelectItem value="GET,HEAD,PUT,POST,DELETE">Tous</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button onClick={handleAddCorsRule} variant="outline">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <Button onClick={handleSaveCors} disabled={saving} className="w-full">
                  {saving ? 'Enregistrement...' : 'Enregistrer CORS'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Bucket Policy</CardTitle>
                <CardDescription>Définissez une policy JSON pour contrôler l'accès au bucket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder='{\"Version\": \"2012-10-17\", \"Statement\": [...]}'
                  value={policy}
                  onChange={(e) => setPolicy(e.target.value)}
                  className="font-mono text-sm min-h-[200px]"
                />
                <div className="text-xs text-muted-foreground">
                  Laissez vide pour supprimer la policy existante
                </div>
                <Button onClick={handleSavePolicy} disabled={saving} className="w-full">
                  {saving ? 'Enregistrement...' : 'Enregistrer la Policy'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Website Tab */}
          <TabsContent value="website" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Hébergement Website statique</CardTitle>
                <CardDescription>Configurez le bucket pour héberger un site web statique</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Activer l'hébergement website</Label>
                  <Switch checked={websiteEnabled} onCheckedChange={setWebsiteEnabled} />
                </div>

                {websiteEnabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Document d'index</Label>
                      <Input
                        value={indexDocument}
                        onChange={(e) => setIndexDocument(e.target.value)}
                        placeholder="index.html"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Document d'erreur</Label>
                      <Input
                        value={errorDocument}
                        onChange={(e) => setErrorDocument(e.target.value)}
                        placeholder="error.html"
                      />
                    </div>
                  </>
                )}

                <Button onClick={handleSaveWebsite} disabled={saving} className="w-full">
                  {saving ? 'Enregistrement...' : 'Enregistrer Website'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACL Tab */}
          <TabsContent value="acl" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">ACL du Bucket</CardTitle>
                <CardDescription>Définissez les permissions d'accès au bucket</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Configuration actuelle */}
                {currentAcl && (
                  <div className="p-4 bg-muted rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4 text-primary" />
                      <strong className="text-sm">Configuration actuelle</strong>
                    </div>
                    <div className="space-y-3 text-sm">
                      {currentAcl.owner && (
                        <div className="flex justify-between items-start">
                          <span className="text-muted-foreground">Propriétaire:</span>
                          <span className="font-medium text-right truncate max-w-[60%]" title={currentAcl.owner.id}>
                            {currentAcl.owner.displayName || currentAcl.owner.id.slice(0, 16) + '...'}
                          </span>
                        </div>
                      )}
                      <div className="space-y-2">
                        <span className="text-muted-foreground">Permissions:</span>
                        <div className="space-y-1 mt-1">
                          {currentAcl.grants.map((grant, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-background rounded border text-xs">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {grant.type === 'CanonicalUser' ? 'Utilisateur' : 
                                   grant.type === 'Group' ? 'Groupe' : grant.type}
                                </Badge>
                                <span className="truncate max-w-[150px]" title={grant.grantee}>
                                  {grant.grantee.includes('AllUsers') ? 'Tous les utilisateurs' :
                                   grant.grantee.includes('AuthenticatedUsers') ? 'Utilisateurs authentifiés' :
                                   grant.grantee.length > 20 ? grant.grantee.slice(0, 20) + '...' : grant.grantee}
                                </span>
                              </div>
                              <Badge variant={grant.permission === 'FULL_CONTROL' ? 'default' : 'secondary'}>
                                {grant.permission}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Modifier l'ACL */}
                <div className={currentAcl ? "border-t pt-4 mt-4" : ""}>
                  {currentAcl && (
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-medium text-sm">Modifier l'ACL</span>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>ACL prédéfini</Label>
                    <Select value={bucketAcl} onValueChange={setBucketAcl}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private - Seul le propriétaire a accès</SelectItem>
                        <SelectItem value="public-read">Public Read - Lecture publique</SelectItem>
                        <SelectItem value="public-read-write">Public Read/Write - Lecture et écriture publiques</SelectItem>
                        <SelectItem value="authenticated-read">Utilisateurs authentifiés</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleSaveAcl} disabled={saving} className="w-full mt-4">
                    {saving ? 'Enregistrement...' : 'Appliquer l\'ACL'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Object Lock Tab */}
          <TabsContent value="lock" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configuration Object Lock par défaut</CardTitle>
                <CardDescription>
                  Définissez la rétention par défaut pour les nouveaux objets.
                  Object Lock doit avoir été activé à la création du bucket.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!bucket.objectLockEnabled && (
                  <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4 text-destructive" />
                      <strong className="text-destructive text-sm">Configuration impossible</strong>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      L'Object Lock doit être activé sur le bucket lors de sa création pour pouvoir configurer la rétention par défaut.
                      Cette fonctionnalité ne peut pas être activée après la création du bucket.
                    </p>
                  </div>
                )}

                {bucket.objectLockEnabled && currentObjectLockConfig && (
                  <div className="p-4 bg-muted rounded-lg border">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="w-4 h-4 text-primary" />
                      <strong className="text-sm">Configuration actuelle</strong>
                      <Badge variant="default" className="ml-auto">Object Lock activé</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mode par défaut:</span>
                        <Badge variant="outline">
                          {currentObjectLockConfig.mode || 'Non configuré'}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Durée de rétention:</span>
                        <span className="font-medium">
                          {currentObjectLockConfig.days 
                            ? `${currentObjectLockConfig.days} jours`
                            : currentObjectLockConfig.years
                              ? `${currentObjectLockConfig.years} ans`
                              : 'Non configurée'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {bucket.objectLockEnabled && (
                  <div className="border-t pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-4">
                      <span className="font-medium text-sm">Modifier la configuration</span>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Mode de rétention par défaut</Label>
                        <Select 
                          value={objectLockMode} 
                          onValueChange={(v) => setObjectLockMode(v as 'COMPLIANCE')}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un mode" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="COMPLIANCE">Compliance (mode WORM strict)</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Outscale ne supporte que le mode COMPLIANCE. La rétention ne peut pas être réduite ni supprimée avant expiration.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label>Durée de rétention (jours)</Label>
                        <Input
                          type="number"
                          value={objectLockDays}
                          onChange={(e) => setObjectLockDays(parseInt(e.target.value) || 0)}
                          min={1}
                        />
                      </div>

                      <Button 
                        onClick={handleSaveObjectLock} 
                        disabled={saving || !objectLockMode || objectLockDays <= 0} 
                        className="w-full"
                      >
                        {saving ? 'Enregistrement...' : 'Mettre à jour la configuration'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
