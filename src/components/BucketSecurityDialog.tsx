import React, { useState, useEffect } from 'react';
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
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { S3Bucket, BucketAcl, BucketPolicy } from '../types/s3';
import { Shield, Users, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';

interface BucketSecurityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: S3Bucket;
}

export const BucketSecurityDialog: React.FC<BucketSecurityDialogProps> = ({
  open,
  onOpenChange,
  bucket
}) => {
  const { getBucketAcl, getBucketPolicy } = useEnhancedDirectS3();
  const [acl, setAcl] = useState<BucketAcl | null>(null);
  const [policy, setPolicy] = useState<BucketPolicy | null>(null);
  const [loadingAcl, setLoadingAcl] = useState(false);
  const [loadingPolicy, setLoadingPolicy] = useState(false);
  const [errorAcl, setErrorAcl] = useState<string | null>(null);
  const [errorPolicy, setErrorPolicy] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadAcl();
      loadPolicy();
    }
  }, [open, bucket.name]);

  const loadAcl = async () => {
    setLoadingAcl(true);
    setErrorAcl(null);
    try {
      const result = await getBucketAcl(bucket.name);
      if (result) {
        setAcl(result);
      } else {
        setErrorAcl('Impossible de récupérer les ACL');
      }
    } catch (error) {
      setErrorAcl('Erreur lors du chargement des ACL');
    } finally {
      setLoadingAcl(false);
    }
  };

  const loadPolicy = async () => {
    setLoadingPolicy(true);
    setErrorPolicy(null);
    try {
      const result = await getBucketPolicy(bucket.name);
      if (result) {
        setPolicy(result);
      } else {
        setErrorPolicy('Impossible de récupérer la policy');
      }
    } catch (error) {
      setErrorPolicy('Erreur lors du chargement de la policy');
    } finally {
      setLoadingPolicy(false);
    }
  };

  const formatJson = (jsonString?: string) => {
    if (!jsonString) return 'Aucune';
    try {
      return JSON.stringify(JSON.parse(jsonString), null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Sécurité du bucket
          </DialogTitle>
          <DialogDescription>
            ACL et policies pour <strong>{bucket.name}</strong>
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="acl" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="acl" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              ACL
            </TabsTrigger>
            <TabsTrigger value="policy" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Policy
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
            ) : acl ? (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Owner */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Propriétaire</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">ID:</span>
                        <span className="font-mono text-xs">{acl.owner.id}</span>
                      </div>
                      {acl.owner.displayName && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Nom:</span>
                          <span>{acl.owner.displayName}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Grants */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Permissions</CardTitle>
                      <CardDescription>
                        {acl.grants.length} {acl.grants.length > 1 ? 'permissions accordées' : 'permission accordée'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {acl.grants.map((grant, index) => (
                          <div key={index} className="p-3 bg-muted/50 rounded-lg space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">
                                {grant.grantee.displayName || grant.grantee.uri || grant.grantee.emailAddress || grant.grantee.id}
                              </span>
                              <Badge variant="secondary">{grant.permission}</Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
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
                </div>
              </ScrollArea>
            ) : null}
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
            ) : policy ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Bucket Policy</CardTitle>
                  <CardDescription>
                    {policy.policy ? 'Policy JSON configurée' : 'Aucune policy configurée'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {policy.policy ? (
                    <ScrollArea className="h-[400px]">
                      <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                        <code>{formatJson(policy.policy)}</code>
                      </pre>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-20" />
                      <p className="text-sm">Aucune policy configurée pour ce bucket</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
