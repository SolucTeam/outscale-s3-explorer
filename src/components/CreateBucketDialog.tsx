
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useS3Store } from '../hooks/useS3Store';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { useToast } from '@/hooks/use-toast';
import { OUTSCALE_REGIONS } from '../data/regions';
import { Info, Lock, GitBranch, Shield, Globe, FileText, Clock, Users, Settings2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { proxyS3Service } from '../services/proxyS3Service';

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBucketDialog = ({ open, onOpenChange }: CreateBucketDialogProps) => {
  const [bucketName, setBucketName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [versioningEnabled, setVersioningEnabled] = useState(false);
  const [objectLockEnabled, setObjectLockEnabled] = useState(false);
  const [encryptionEnabled, setEncryptionEnabled] = useState(false);
  
  // Advanced options
  const [enableAdvanced, setEnableAdvanced] = useState(false);
  const [aclEnabled, setAclEnabled] = useState(false);
  const [aclValue, setAclValue] = useState('private');
  const [corsEnabled, setCorsEnabled] = useState(false);
  const [corsConfig, setCorsConfig] = useState(`[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedOrigins": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]`);
  const [lifecycleEnabled, setLifecycleEnabled] = useState(false);
  const [lifecycleConfig, setLifecycleConfig] = useState(`{
  "Rules": [
    {
      "ID": "expire-old-objects",
      "Status": "Enabled",
      "Filter": { "Prefix": "" },
      "Expiration": { "Days": 365 }
    }
  ]
}`);
  const [policyEnabled, setPolicyEnabled] = useState(false);
  const [policyConfig, setPolicyConfig] = useState('');
  const [websiteEnabled, setWebsiteEnabled] = useState(false);
  const [websiteIndex, setWebsiteIndex] = useState('index.html');
  const [websiteError, setWebsiteError] = useState('error.html');
  
  const { credentials } = useS3Store();
  const { createBucket } = useEnhancedDirectS3();
  const { toast } = useToast();

  const currentRegion = credentials?.region || 'eu-west-2';
  const regionInfo = OUTSCALE_REGIONS.find(r => r.id === currentRegion);

  const resetForm = () => {
    setBucketName('');
    setVersioningEnabled(false);
    setObjectLockEnabled(false);
    setEncryptionEnabled(false);
    setEnableAdvanced(false);
    setAclEnabled(false);
    setAclValue('private');
    setCorsEnabled(false);
    setLifecycleEnabled(false);
    setPolicyEnabled(false);
    setPolicyConfig('');
    setWebsiteEnabled(false);
  };

  const applyAdvancedSettings = async (bucketName: string) => {
    const errors: string[] = [];

    // Apply ACL
    if (aclEnabled) {
      try {
        const result = await proxyS3Service.setBucketAcl(bucketName, aclValue);
        if (!result.success) errors.push(`ACL: ${result.error}`);
      } catch (e) {
        errors.push(`ACL: ${e}`);
      }
    }

    // Apply CORS
    if (corsEnabled) {
      try {
        const corsRules = JSON.parse(corsConfig);
        const result = await proxyS3Service.setBucketCors(bucketName, corsRules);
        if (!result.success) errors.push(`CORS: ${result.error}`);
      } catch (e) {
        errors.push(`CORS: Configuration JSON invalide`);
      }
    }

    // Apply Lifecycle
    if (lifecycleEnabled) {
      try {
        const lifecycle = JSON.parse(lifecycleConfig);
        const result = await proxyS3Service.putBucketLifecycleConfiguration(bucketName, lifecycle);
        if (!result.success) errors.push(`Lifecycle: ${result.error}`);
      } catch (e) {
        errors.push(`Lifecycle: Configuration JSON invalide`);
      }
    }

    // Apply Policy
    if (policyEnabled && policyConfig.trim()) {
      try {
        JSON.parse(policyConfig); // Validate JSON
        const result = await proxyS3Service.setBucketPolicy(bucketName, policyConfig);
        if (!result.success) errors.push(`Policy: ${result.error}`);
      } catch (e) {
        errors.push(`Policy: Configuration JSON invalide`);
      }
    }

    // Apply Website
    if (websiteEnabled) {
      try {
        const result = await proxyS3Service.setBucketWebsite(bucketName, websiteIndex, websiteError);
        if (!result.success) errors.push(`Website: ${result.error}`);
      } catch (e) {
        errors.push(`Website: ${e}`);
      }
    }

    return errors;
  };

  const handleCreate = async () => {
    if (!bucketName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de bucket",
        variant: "destructive"
      });
      return;
    }

    const bucketNameRegex = /^[a-z0-9][a-z0-9\-]*[a-z0-9]$/;
    if (bucketName.length < 3 || bucketName.length > 63 || !bucketNameRegex.test(bucketName)) {
      toast({
        title: "Nom invalide",
        description: "Le nom doit contenir 3-63 caractères, uniquement des minuscules, chiffres et tirets",
        variant: "destructive"
      });
      return;
    }

    setIsCreating(true);
    
    const success = await createBucket(bucketName, currentRegion, {
      versioningEnabled,
      objectLockEnabled,
      encryptionEnabled
    });
    
    if (success) {
      // Apply advanced settings if enabled
      if (enableAdvanced) {
        const errors = await applyAdvancedSettings(bucketName);
        if (errors.length > 0) {
          toast({
            title: "Bucket créé avec avertissements",
            description: `Certaines options n'ont pas pu être appliquées: ${errors.join(', ')}`,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Succès",
            description: `Bucket "${bucketName}" créé avec toutes les options`
          });
        }
      } else {
        toast({
          title: "Succès",
          description: `Bucket "${bucketName}" créé avec succès`
        });
      }
      resetForm();
      onOpenChange(false);
    } else {
      toast({
        title: "Erreur",
        description: "Erreur lors de la création du bucket",
        variant: "destructive"
      });
    }
    
    setIsCreating(false);
  };

  const generatePolicyTemplate = () => {
    setPolicyConfig(`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::${bucketName || 'BUCKET_NAME'}/*"
    }
  ]
}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Créer un nouveau bucket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Nom du bucket */}
          <div>
            <Label htmlFor="bucket-name">Nom du bucket</Label>
            <Input
              id="bucket-name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value.toLowerCase())}
              placeholder="mon-nouveau-bucket"
              disabled={isCreating}
            />
            <p className="text-sm text-muted-foreground mt-1">
              3-63 caractères, minuscules, chiffres et tirets uniquement
            </p>
          </div>
          
          {/* Région */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <Label className="text-sm font-medium">Région et endpoint</Label>
            <div className="mt-1 space-y-1">
              <p className="text-sm font-medium">{regionInfo?.name || currentRegion}</p>
              <p className="text-xs text-muted-foreground">{regionInfo?.endpoint || `Région: ${currentRegion}`}</p>
            </div>
          </div>

          <Separator />

          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="basic">Options de base</TabsTrigger>
              <TabsTrigger value="advanced">Options avancées</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Sécurité et versioning
              </h3>

              {/* Versioning */}
              <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-blue-600" />
                    <Label htmlFor="versioning" className="font-medium">Versioning</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Conserve plusieurs versions de vos objets
                  </p>
                </div>
                <Switch
                  id="versioning"
                  checked={versioningEnabled}
                  onCheckedChange={setVersioningEnabled}
                  disabled={isCreating || objectLockEnabled}
                />
              </div>

              {/* Object Lock */}
              <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600" />
                    <Label htmlFor="object-lock" className="font-medium">Object Lock</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Protection WORM - empêche la suppression/modification
                  </p>
                  {objectLockEnabled && (
                    <div className="mt-2 p-2 bg-amber-50 border-l-2 border-amber-500 rounded">
                      <p className="text-xs text-amber-800 flex items-center gap-1">
                        <Info className="w-3 h-3" />
                        Le versioning sera activé automatiquement
                      </p>
                    </div>
                  )}
                </div>
                <Switch
                  id="object-lock"
                  checked={objectLockEnabled}
                  onCheckedChange={(checked) => {
                    setObjectLockEnabled(checked);
                    if (checked) setVersioningEnabled(true);
                  }}
                  disabled={isCreating}
                />
              </div>

              {/* Encryption */}
              <div className="flex items-start justify-between space-x-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    <Label htmlFor="encryption" className="font-medium">Chiffrement</Label>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Chiffrement AES-256 côté serveur
                  </p>
                </div>
                <Switch
                  id="encryption"
                  checked={encryptionEnabled}
                  onCheckedChange={setEncryptionEnabled}
                  disabled={isCreating}
                />
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="w-4 h-4" />
                  Configuration avancée
                </h3>
                <div className="flex items-center gap-2">
                  <Label htmlFor="enable-advanced" className="text-sm">Activer</Label>
                  <Switch
                    id="enable-advanced"
                    checked={enableAdvanced}
                    onCheckedChange={setEnableAdvanced}
                    disabled={isCreating}
                  />
                </div>
              </div>

              {enableAdvanced && (
                <div className="space-y-4">
                  {/* ACL */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        <Label className="font-medium">ACL (Access Control List)</Label>
                      </div>
                      <Switch
                        checked={aclEnabled}
                        onCheckedChange={setAclEnabled}
                        disabled={isCreating}
                      />
                    </div>
                    {aclEnabled && (
                      <Select value={aclValue} onValueChange={setAclValue}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="private">Private</SelectItem>
                          <SelectItem value="public-read">Public Read</SelectItem>
                          <SelectItem value="public-read-write">Public Read/Write</SelectItem>
                          <SelectItem value="authenticated-read">Authenticated Read</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* CORS */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-blue-600" />
                        <Label className="font-medium">CORS Configuration</Label>
                      </div>
                      <Switch
                        checked={corsEnabled}
                        onCheckedChange={setCorsEnabled}
                        disabled={isCreating}
                      />
                    </div>
                    {corsEnabled && (
                      <Textarea
                        value={corsConfig}
                        onChange={(e) => setCorsConfig(e.target.value)}
                        className="font-mono text-xs h-32"
                        placeholder="Configuration CORS en JSON"
                      />
                    )}
                  </div>

                  {/* Lifecycle */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-600" />
                        <Label className="font-medium">Lifecycle Rules</Label>
                      </div>
                      <Switch
                        checked={lifecycleEnabled}
                        onCheckedChange={setLifecycleEnabled}
                        disabled={isCreating}
                      />
                    </div>
                    {lifecycleEnabled && (
                      <Textarea
                        value={lifecycleConfig}
                        onChange={(e) => setLifecycleConfig(e.target.value)}
                        className="font-mono text-xs h-32"
                        placeholder="Configuration Lifecycle en JSON"
                      />
                    )}
                  </div>

                  {/* Policy */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-green-600" />
                        <Label className="font-medium">Bucket Policy</Label>
                      </div>
                      <Switch
                        checked={policyEnabled}
                        onCheckedChange={setPolicyEnabled}
                        disabled={isCreating}
                      />
                    </div>
                    {policyEnabled && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={generatePolicyTemplate}
                        >
                          Générer un template
                        </Button>
                        <Textarea
                          value={policyConfig}
                          onChange={(e) => setPolicyConfig(e.target.value)}
                          className="font-mono text-xs h-32"
                          placeholder="Policy JSON"
                        />
                      </>
                    )}
                  </div>

                  {/* Website */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-teal-600" />
                        <Label className="font-medium">Static Website Hosting</Label>
                      </div>
                      <Switch
                        checked={websiteEnabled}
                        onCheckedChange={setWebsiteEnabled}
                        disabled={isCreating}
                      />
                    </div>
                    {websiteEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs">Index Document</Label>
                          <Input
                            value={websiteIndex}
                            onChange={(e) => setWebsiteIndex(e.target.value)}
                            placeholder="index.html"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Error Document</Label>
                          <Input
                            value={websiteError}
                            onChange={(e) => setWebsiteError(e.target.value)}
                            placeholder="error.html"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!enableAdvanced && (
                <div className="text-center py-8 text-muted-foreground">
                  <Settings2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Activez les options avancées pour configurer ACL, CORS, Lifecycle, Policy et Website</p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Info */}
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex gap-2">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-blue-800">
                <p className="font-medium">Note :</p>
                <p>Les options avancées seront appliquées après la création du bucket.</p>
              </div>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Création...' : 'Créer le bucket'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
