import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { S3Bucket, BucketAcl, BucketPolicy } from '../types/s3';
import { Shield, Users, FileText, Loader2, AlertCircle, Save, Trash2, Eye, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

interface BucketSecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: S3Bucket;
}

// ACL prédéfinis S3
const PREDEFINED_ACLS = [
  { value: 'private', label: 'Privé', description: 'Seul le propriétaire a un accès complet' },
  { value: 'public-read', label: 'Lecture publique', description: 'Tout le monde peut lire' },
  { value: 'public-read-write', label: 'Lecture/Écriture publique', description: 'Tout le monde peut lire et écrire' },
  { value: 'authenticated-read', label: 'Lecture authentifiée', description: 'Les utilisateurs authentifiés peuvent lire' },
];

// Templates de policies
const POLICY_TEMPLATES = [
  {
    name: 'Lecture publique',
    description: 'Permet à tout le monde de lire les objets',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: 's3:GetObject',
          Resource: 'arn:aws:s3:::BUCKET_NAME/*'
        }
      ]
    }
  },
  {
    name: 'Lecture/Écriture pour un utilisateur',
    description: 'Accès complet pour un utilisateur spécifique',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'AllowUserAccess',
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::ACCOUNT_ID:user/USER_NAME' },
          Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
          Resource: 'arn:aws:s3:::BUCKET_NAME/*'
        }
      ]
    }
  },
  {
    name: 'Refuser les suppressions',
    description: 'Empêche la suppression des objets',
    policy: {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'DenyDeleteObject',
          Effect: 'Deny',
          Principal: '*',
          Action: 's3:DeleteObject',
          Resource: 'arn:aws:s3:::BUCKET_NAME/*'
        }
      ]
    }
  }
];

interface EffectivePermission {
  action: string;
  allowed: boolean;
  source: 'ACL' | 'Policy' | 'Default';
  details: string;
}

export const BucketSecurityDialog: React.FC<BucketSecurityDialogProps> = ({
  open,
  onOpenChange,
  bucket
}) => {
  const { getBucketAcl, getBucketPolicy, setBucketAcl, setBucketPolicy, deleteBucketPolicy } = useEnhancedDirectS3();
  const { toast } = useToast();
  
  const [acl, setAcl] = useState<BucketAcl | null>(null);
  const [policy, setPolicy] = useState<BucketPolicy | null>(null);
  const [loadingAcl, setLoadingAcl] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [errorAcl, setErrorAcl] = useState<string | null>(null);
  const [errorPolicy, setErrorPolicy] = useState<string | null>(null);
  
  // États pour l'édition
  const [selectedAcl, setSelectedAcl] = useState<string>('private');
  const [policyText, setPolicyText] = useState<string>('');
  const [savingAcl, setSavingAcl] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  
  // Permissions effectives calculées
  const [effectivePermissions, setEffectivePermissions] = useState<EffectivePermission[]>([]);

  const loadAcl = useCallback(async () => {
    setLoadingAcl(true);
    setErrorAcl(null);
    try {
      const result = await getBucketAcl(bucket.name);
      if (result) {
        setAcl(result);
        // Détecter l'ACL actuel basé sur les grants
        detectCurrentAcl(result);
      } else {
        setErrorAcl('Impossible de récupérer les ACL');
      }
    } catch (error) {
      setErrorAcl('Erreur lors du chargement des ACL');
    } finally {
      setLoadingAcl(false);
    }
  }, [bucket.name, getBucketAcl]);

  const loadPolicy = useCallback(async () => {
    setLoadingPolicy(true);
    setErrorPolicy(null);
    try {
      const result = await getBucketPolicy(bucket.name);
      if (result) {
        setPolicy(result);
        setPolicyText(result.policy ? formatJson(result.policy) : '');
      } else {
        setPolicy({ policy: undefined });
        setPolicyText('');
      }
    } catch (error) {
      setErrorPolicy('Erreur lors du chargement de la policy');
    } finally {
      setLoadingPolicy(false);
    }
  }, [bucket.name, getBucketPolicy]);

  useEffect(() => {
    if (open) {
      loadAcl();
      loadPolicy();
    }
  }, [open, loadAcl, loadPolicy]);

  // Calculer les permissions effectives
  useEffect(() => {
    calculateEffectivePermissions();
  }, [acl, policy]);

  const detectCurrentAcl = (aclData: BucketAcl) => {
    const hasPublicRead = aclData.grants.some(g => 
      g.grantee.uri === 'http://acs.amazonaws.com/groups/global/AllUsers' && 
      (g.permission === 'READ' || g.permission === 'FULL_CONTROL')
    );
    const hasPublicWrite = aclData.grants.some(g => 
      g.grantee.uri === 'http://acs.amazonaws.com/groups/global/AllUsers' && 
      (g.permission === 'WRITE' || g.permission === 'FULL_CONTROL')
    );
    const hasAuthRead = aclData.grants.some(g => 
      g.grantee.uri === 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers' && 
      g.permission === 'READ'
    );

    if (hasPublicRead && hasPublicWrite) {
      setSelectedAcl('public-read-write');
    } else if (hasPublicRead) {
      setSelectedAcl('public-read');
    } else if (hasAuthRead) {
      setSelectedAcl('authenticated-read');
    } else {
      setSelectedAcl('private');
    }
  };

  const calculateEffectivePermissions = () => {
    const permissions: EffectivePermission[] = [];
    
    // Permissions de base basées sur l'ACL
    if (acl) {
      const hasPublicRead = acl.grants.some(g => 
        g.grantee.uri?.includes('AllUsers') && 
        (g.permission === 'READ' || g.permission === 'FULL_CONTROL')
      );
      const hasPublicWrite = acl.grants.some(g => 
        g.grantee.uri?.includes('AllUsers') && 
        (g.permission === 'WRITE' || g.permission === 'FULL_CONTROL')
      );
      
      permissions.push({
        action: 's3:GetObject (Public)',
        allowed: hasPublicRead,
        source: 'ACL',
        details: hasPublicRead ? 'AllUsers a la permission READ' : 'Aucun accès public en lecture'
      });
      
      permissions.push({
        action: 's3:PutObject (Public)',
        allowed: hasPublicWrite,
        source: 'ACL',
        details: hasPublicWrite ? 'AllUsers a la permission WRITE' : 'Aucun accès public en écriture'
      });
    }
    
    // Analyser la policy
    if (policy?.policy) {
      try {
        const policyObj = JSON.parse(policy.policy);
        if (policyObj.Statement) {
          policyObj.Statement.forEach((stmt: any) => {
            const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
            const isAllow = stmt.Effect === 'Allow';
            const principal = typeof stmt.Principal === 'string' ? stmt.Principal : JSON.stringify(stmt.Principal);
            
            actions.forEach((action: string) => {
              permissions.push({
                action: `${action} (Policy)`,
                allowed: isAllow,
                source: 'Policy',
                details: `${stmt.Effect} pour ${principal}`
              });
            });
          });
        }
      } catch (e) {
        // Policy invalide
      }
    }
    
    // Permissions par défaut du propriétaire
    permissions.push({
      action: 'Toutes les actions (Propriétaire)',
      allowed: true,
      source: 'Default',
      details: 'Le propriétaire a toujours un accès complet'
    });
    
    setEffectivePermissions(permissions);
  };

  const formatJson = (jsonString?: string) => {
    if (!jsonString) return '';
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  const validatePolicy = (text: string): boolean => {
    if (!text.trim()) {
      setPolicyError(null);
      return true;
    }
    try {
      const parsed = JSON.parse(text);
      if (!parsed.Version || !parsed.Statement) {
        setPolicyError('La policy doit contenir "Version" et "Statement"');
        return false;
      }
      setPolicyError(null);
      return true;
    } catch (e) {
      setPolicyError('JSON invalide');
      return false;
    }
  };

  const handleSaveAcl = async () => {
    setSavingAcl(true);
    try {
      const success = await setBucketAcl(bucket.name, selectedAcl);
      if (success) {
        await loadAcl();
      }
    } finally {
      setSavingAcl(false);
    }
  };

  const handleSavePolicy = async () => {
    if (!validatePolicy(policyText)) return;
    
    setSavingPolicy(true);
    try {
      const policyToSave = policyText.trim().replace(/BUCKET_NAME/g, bucket.name);
      const success = await setBucketPolicy(bucket.name, policyToSave);
      if (success) {
        await loadPolicy();
      }
    } finally {
      setSavingPolicy(false);
    }
  };

  const handleDeletePolicy = async () => {
    setDeletingPolicy(true);
    try {
      const success = await deleteBucketPolicy(bucket.name);
      if (success) {
        setPolicy({ policy: undefined });
        setPolicyText('');
      }
    } finally {
      setDeletingPolicy(false);
    }
  };

  const applyTemplate = (template: typeof POLICY_TEMPLATES[0]) => {
    const policyWithBucket = JSON.stringify(template.policy, null, 2)
      .replace(/BUCKET_NAME/g, bucket.name);
    setPolicyText(policyWithBucket);
    validatePolicy(policyWithBucket);
  };

  const getPermissionIcon = (permission: string) => {
    switch (permission) {
      case 'FULL_CONTROL':
        return <Badge variant="destructive">Contrôle total</Badge>;
      case 'READ':
        return <Badge variant="secondary">Lecture</Badge>;
      case 'WRITE':
        return <Badge variant="outline">Écriture</Badge>;
      case 'READ_ACP':
        return <Badge variant="secondary">Lire ACL</Badge>;
      case 'WRITE_ACP':
        return <Badge variant="outline">Modifier ACL</Badge>;
      default:
        return <Badge>{permission}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Gestion de la sécurité
          </DialogTitle>
          <DialogDescription>
            ACL, policies et permissions pour <strong>{bucket.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="acl" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="acl" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              ACL
            </TabsTrigger>
            <TabsTrigger value="policy" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Policy
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          </TabsList>

          {/* ACL Tab */}
          <TabsContent value="acl" className="space-y-4">
            {loadingAcl ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : errorAcl ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorAcl}</AlertDescription>
              </Alert>
            ) : (
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-4">
                  {/* ACL prédéfini */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">ACL prédéfini</CardTitle>
                      <CardDescription>Sélectionnez un niveau d'accès prédéfini</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Select value={selectedAcl} onValueChange={setSelectedAcl}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un ACL" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREDEFINED_ACLS.map(acl => (
                            <SelectItem key={acl.value} value={acl.value}>
                              <div className="flex flex-col">
                                <span>{acl.label}</span>
                                <span className="text-xs text-muted-foreground">{acl.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        onClick={handleSaveAcl} 
                        disabled={savingAcl}
                        className="w-full"
                      >
                        {savingAcl ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Appliquer l'ACL
                      </Button>
                    </CardContent>
                  </Card>

                  <Separator />

                  {/* Propriétaire */}
                  {acl && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Propriétaire du bucket</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">ID:</span>
                          <span className="font-mono text-xs truncate max-w-[300px]">{acl.owner.id}</span>
                        </div>
                        {acl.owner.displayName && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nom:</span>
                            <span>{acl.owner.displayName}</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Grants détaillés */}
                  {acl && acl.grants.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Permissions détaillées</CardTitle>
                        <CardDescription>
                          {acl.grants.length} {acl.grants.length > 1 ? 'permissions accordées' : 'permission accordée'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {acl.grants.map((grant, index) => (
                            <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium truncate max-w-[250px]">
                                  {grant.grantee.displayName || 
                                   (grant.grantee.uri?.includes('AllUsers') ? '🌍 Tout le monde' : 
                                    grant.grantee.uri?.includes('AuthenticatedUsers') ? '🔐 Utilisateurs authentifiés' :
                                    grant.grantee.emailAddress || 
                                    grant.grantee.id?.substring(0, 20) + '...')}
                                </span>
                                {getPermissionIcon(grant.permission)}
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                <div>Type: {grant.grantee.type}</div>
                                {grant.grantee.id && (
                                  <div className="font-mono truncate">ID: {grant.grantee.id}</div>
                                )}
                                {grant.grantee.uri && (
                                  <div className="truncate">URI: {grant.grantee.uri}</div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          {/* Policy Tab */}
          <TabsContent value="policy" className="space-y-4">
            {loadingPolicy ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : errorPolicy ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorPolicy}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {/* Templates */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Templates de policy</CardTitle>
                    <CardDescription>Utilisez un template comme point de départ</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {POLICY_TEMPLATES.map((template, index) => (
                        <Button 
                          key={index}
                          variant="outline" 
                          size="sm"
                          onClick={() => applyTemplate(template)}
                        >
                          {template.name}
                        </Button>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Éditeur de policy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Éditeur de policy JSON</CardTitle>
                    <CardDescription>
                      Modifiez directement la policy du bucket
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Policy JSON</Label>
                      <Textarea 
                        value={policyText}
                        onChange={(e) => {
                          setPolicyText(e.target.value);
                          validatePolicy(e.target.value);
                        }}
                        placeholder='{"Version": "2012-10-17", "Statement": [...]}'
                        className="font-mono text-xs min-h-[250px]"
                      />
                      {policyError && (
                        <p className="text-xs text-destructive">{policyError}</p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        onClick={handleSavePolicy} 
                        disabled={savingPolicy || !!policyError}
                        className="flex-1"
                      >
                        {savingPolicy ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Enregistrer la policy
                      </Button>
                      
                      {policy?.policy && (
                        <Button 
                          variant="destructive"
                          onClick={handleDeletePolicy}
                          disabled={deletingPolicy}
                        >
                          {deletingPolicy ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4 mr-2" />
                          )}
                          Supprimer
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Permissions Preview Tab */}
          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Permissions effectives</CardTitle>
                    <CardDescription>
                      Résumé des permissions calculées à partir des ACL et policies
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { loadAcl(); loadPolicy(); }}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Actualiser
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {effectivePermissions.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Shield className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">Chargement des permissions...</p>
                      </div>
                    ) : (
                      effectivePermissions.map((perm, index) => (
                        <div 
                          key={index} 
                          className={`p-3 rounded-lg border flex items-center justify-between ${
                            perm.allowed 
                              ? 'bg-green-500/10 border-green-500/20' 
                              : 'bg-red-500/10 border-red-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {perm.allowed ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <div>
                              <p className="text-sm font-medium">{perm.action}</p>
                              <p className="text-xs text-muted-foreground">{perm.details}</p>
                            </div>
                          </div>
                          <Badge variant="outline">{perm.source}</Badge>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Légende */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Comprendre les permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">ACL</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Permissions héritées des Access Control Lists
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Policy</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Permissions définies dans la bucket policy JSON
                    </p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Default</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Permissions par défaut du propriétaire
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
