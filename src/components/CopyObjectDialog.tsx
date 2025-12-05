import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Copy, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proxyS3Service } from '@/services/proxyS3Service';
import { useS3Store } from '@/hooks/useS3Store';

interface CopyObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceBucket: string;
  sourceKey: string;
  onCopyComplete?: () => void;
}

export const CopyObjectDialog: React.FC<CopyObjectDialogProps> = ({
  open,
  onOpenChange,
  sourceBucket,
  sourceKey,
  onCopyComplete,
}) => {
  const { toast } = useToast();
  const { buckets } = useS3Store();
  const [isCopying, setIsCopying] = useState(false);
  
  // Basic options
  const [destBucket, setDestBucket] = useState(sourceBucket);
  const [destKey, setDestKey] = useState(sourceKey);
  
  // ACL options
  const [aclEnabled, setAclEnabled] = useState(false);
  const [aclValue, setAclValue] = useState<string>('private');
  
  // Metadata options
  const [metadataDirective, setMetadataDirective] = useState<'COPY' | 'REPLACE'>('COPY');
  const [customMetadata, setCustomMetadata] = useState('');
  
  // Tagging options
  const [taggingDirective, setTaggingDirective] = useState<'COPY' | 'REPLACE'>('COPY');
  const [customTags, setCustomTags] = useState('');
  
  // Content options
  const [contentType, setContentType] = useState('');
  const [contentDisposition, setContentDisposition] = useState('');
  const [contentEncoding, setContentEncoding] = useState('');
  const [contentLanguage, setContentLanguage] = useState('');
  const [cacheControl, setCacheControl] = useState('');
  
  // Encryption
  const [serverSideEncryption, setServerSideEncryption] = useState(false);
  
  // Object Lock
  const [objectLockEnabled, setObjectLockEnabled] = useState(false);
  const [objectLockMode, setObjectLockMode] = useState<'GOVERNANCE' | 'COMPLIANCE'>('GOVERNANCE');
  const [objectLockRetainUntilDate, setObjectLockRetainUntilDate] = useState('');
  
  // Conditional copy
  const [conditionalCopy, setConditionalCopy] = useState(false);
  const [copySourceIfMatch, setCopySourceIfMatch] = useState('');
  const [copySourceIfNoneMatch, setCopySourceIfNoneMatch] = useState('');
  const [copySourceIfModifiedSince, setCopySourceIfModifiedSince] = useState('');
  const [copySourceIfUnmodifiedSince, setCopySourceIfUnmodifiedSince] = useState('');

  useEffect(() => {
    if (open) {
      setDestBucket(sourceBucket);
      setDestKey(sourceKey);
      setAclEnabled(false);
      setAclValue('private');
      setMetadataDirective('COPY');
      setCustomMetadata('');
      setTaggingDirective('COPY');
      setCustomTags('');
      setContentType('');
      setContentDisposition('');
      setContentEncoding('');
      setContentLanguage('');
      setCacheControl('');
      setServerSideEncryption(false);
      setObjectLockEnabled(false);
      setObjectLockMode('GOVERNANCE');
      setObjectLockRetainUntilDate('');
      setConditionalCopy(false);
      setCopySourceIfMatch('');
      setCopySourceIfNoneMatch('');
      setCopySourceIfModifiedSince('');
      setCopySourceIfUnmodifiedSince('');
    }
  }, [open, sourceBucket, sourceKey]);

  const handleCopy = async () => {
    if (!destBucket || !destKey) {
      toast({
        title: "Erreur",
        description: "Le bucket et la clé de destination sont requis",
        variant: "destructive"
      });
      return;
    }

    setIsCopying(true);
    try {
      // Build copy options
      const copyOptions: any = {
        sourceBucket,
        sourceKey,
        destKey,
      };

      if (aclEnabled && aclValue) {
        copyOptions.acl = aclValue;
      }

      if (metadataDirective === 'REPLACE' && customMetadata) {
        try {
          copyOptions.metadata = JSON.parse(customMetadata);
          copyOptions.metadataDirective = 'REPLACE';
        } catch (e) {
          toast({
            title: "Erreur",
            description: "Format JSON des métadonnées invalide",
            variant: "destructive"
          });
          setIsCopying(false);
          return;
        }
      }

      if (taggingDirective === 'REPLACE' && customTags) {
        copyOptions.tagging = customTags;
        copyOptions.taggingDirective = 'REPLACE';
      }

      if (contentType) copyOptions.contentType = contentType;
      if (contentDisposition) copyOptions.contentDisposition = contentDisposition;
      if (contentEncoding) copyOptions.contentEncoding = contentEncoding;
      if (contentLanguage) copyOptions.contentLanguage = contentLanguage;
      if (cacheControl) copyOptions.cacheControl = cacheControl;

      if (serverSideEncryption) {
        copyOptions.serverSideEncryption = 'AES256';
      }

      if (objectLockEnabled) {
        copyOptions.objectLockMode = objectLockMode;
        if (objectLockRetainUntilDate) {
          copyOptions.objectLockRetainUntilDate = new Date(objectLockRetainUntilDate).toISOString();
        }
      }

      if (conditionalCopy) {
        if (copySourceIfMatch) copyOptions.copySourceIfMatch = copySourceIfMatch;
        if (copySourceIfNoneMatch) copyOptions.copySourceIfNoneMatch = copySourceIfNoneMatch;
        if (copySourceIfModifiedSince) copyOptions.copySourceIfModifiedSince = copySourceIfModifiedSince;
        if (copySourceIfUnmodifiedSince) copyOptions.copySourceIfUnmodifiedSince = copySourceIfUnmodifiedSince;
      }

      const response = await proxyS3Service.copyObject(sourceBucket, sourceKey, destBucket, destKey, copyOptions);

      if (response.success) {
        toast({
          title: "Succès",
          description: `Objet copié vers "${destBucket}/${destKey}"`
        });
        onOpenChange(false);
        onCopyComplete?.();
      } else {
        toast({
          title: "Erreur",
          description: response.error || "Erreur lors de la copie",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Copy error:', error);
      toast({
        title: "Erreur",
        description: "Erreur lors de la copie de l'objet",
        variant: "destructive"
      });
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5" />
            Copier l'objet
          </DialogTitle>
          <DialogDescription>
            Copier "{sourceKey}" depuis le bucket "{sourceBucket}"
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="destination" className="w-full">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="destination">Destination</TabsTrigger>
            <TabsTrigger value="acl">ACL</TabsTrigger>
            <TabsTrigger value="metadata">Métadonnées</TabsTrigger>
            <TabsTrigger value="options">Options</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
          </TabsList>

          <TabsContent value="destination" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="destBucket">Bucket de destination *</Label>
              <Select value={destBucket} onValueChange={setDestBucket}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un bucket" />
                </SelectTrigger>
                <SelectContent>
                  {buckets.map((bucket) => (
                    <SelectItem key={bucket.name} value={bucket.name}>
                      {bucket.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Vous pouvez copier dans le même bucket ou un autre bucket
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="destKey">Clé de destination *</Label>
              <Input
                id="destKey"
                value={destKey}
                onChange={(e) => setDestKey(e.target.value)}
                placeholder="chemin/vers/nouveau-fichier.ext"
              />
              <p className="text-xs text-muted-foreground">
                Utilisez des préfixes pour organiser (ex: dossier/sous-dossier/fichier.txt)
              </p>
            </div>
          </TabsContent>

          <TabsContent value="acl" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Définir ACL personnalisée</Label>
                <p className="text-xs text-muted-foreground">
                  Par défaut, vous êtes propriétaire de la copie
                </p>
              </div>
              <Switch checked={aclEnabled} onCheckedChange={setAclEnabled} />
            </div>

            {aclEnabled && (
              <div className="space-y-2">
                <Label>Permissions ACL</Label>
                <Select value={aclValue} onValueChange={setAclValue}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">Private (par défaut)</SelectItem>
                    <SelectItem value="public-read">Public Read</SelectItem>
                    <SelectItem value="public-read-write">Public Read/Write</SelectItem>
                    <SelectItem value="authenticated-read">Authenticated Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </TabsContent>

          <TabsContent value="metadata" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Directive des métadonnées</Label>
              <Select value={metadataDirective} onValueChange={(v: 'COPY' | 'REPLACE') => setMetadataDirective(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COPY">COPY - Copier depuis l'objet source</SelectItem>
                  <SelectItem value="REPLACE">REPLACE - Remplacer par de nouvelles métadonnées</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {metadataDirective === 'REPLACE' && (
              <div className="space-y-2">
                <Label>Métadonnées personnalisées (JSON)</Label>
                <Textarea
                  value={customMetadata}
                  onChange={(e) => setCustomMetadata(e.target.value)}
                  placeholder='{"key1": "value1", "key2": "value2"}'
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>Directive des tags</Label>
              <Select value={taggingDirective} onValueChange={(v: 'COPY' | 'REPLACE') => setTaggingDirective(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COPY">COPY - Copier depuis l'objet source</SelectItem>
                  <SelectItem value="REPLACE">REPLACE - Remplacer par de nouveaux tags</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {taggingDirective === 'REPLACE' && (
              <div className="space-y-2">
                <Label>Tags (format URL query)</Label>
                <Input
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="key1=value1&key2=value2"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="options" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Content-Type</Label>
                <Input
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  placeholder="image/png, application/pdf..."
                />
              </div>

              <div className="space-y-2">
                <Label>Content-Disposition</Label>
                <Select value={contentDisposition || "_none"} onValueChange={(v) => setContentDisposition(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Non défini</SelectItem>
                    <SelectItem value="inline">Inline</SelectItem>
                    <SelectItem value="attachment">Attachment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content-Encoding</Label>
                <Select value={contentEncoding || "_none"} onValueChange={(v) => setContentEncoding(v === "_none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Non défini</SelectItem>
                    <SelectItem value="gzip">gzip</SelectItem>
                    <SelectItem value="compress">compress</SelectItem>
                    <SelectItem value="deflate">deflate</SelectItem>
                    <SelectItem value="br">br</SelectItem>
                    <SelectItem value="identity">identity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Content-Language</Label>
                <Input
                  value={contentLanguage}
                  onChange={(e) => setContentLanguage(e.target.value)}
                  placeholder="fr, en, de..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cache-Control</Label>
              <Select value={cacheControl || "_none"} onValueChange={(v) => setCacheControl(v === "_none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Non défini</SelectItem>
                  <SelectItem value="no-cache">no-cache</SelectItem>
                  <SelectItem value="no-store">no-store</SelectItem>
                  <SelectItem value="max-age=3600">max-age=3600 (1h)</SelectItem>
                  <SelectItem value="max-age=86400">max-age=86400 (1j)</SelectItem>
                  <SelectItem value="max-age=604800">max-age=604800 (1 semaine)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Chiffrement côté serveur (SSE)</Label>
                <p className="text-xs text-muted-foreground">AES256</p>
              </div>
              <Switch checked={serverSideEncryption} onCheckedChange={setServerSideEncryption} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Object Lock</Label>
                <p className="text-xs text-muted-foreground">Configurer la rétention</p>
              </div>
              <Switch checked={objectLockEnabled} onCheckedChange={setObjectLockEnabled} />
            </div>

            {objectLockEnabled && (
              <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>Mode de rétention</Label>
                  <Select value={objectLockMode} onValueChange={(v: 'GOVERNANCE' | 'COMPLIANCE') => setObjectLockMode(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GOVERNANCE">Governance</SelectItem>
                      <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Retenir jusqu'au</Label>
                  <Input
                    type="datetime-local"
                    value={objectLockRetainUntilDate}
                    onChange={(e) => setObjectLockRetainUntilDate(e.target.value)}
                  />
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="conditions" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Copie conditionnelle</Label>
                <p className="text-xs text-muted-foreground">
                  Copier uniquement si certaines conditions sont remplies
                </p>
              </div>
              <Switch checked={conditionalCopy} onCheckedChange={setConditionalCopy} />
            </div>

            {conditionalCopy && (
              <div className="space-y-4 pl-4 border-l-2 border-muted">
                <div className="space-y-2">
                  <Label>CopySource-If-Match (ETag)</Label>
                  <Input
                    value={copySourceIfMatch}
                    onChange={(e) => setCopySourceIfMatch(e.target.value)}
                    placeholder='"b4fb2aaa356797d9a28bfc640a973720"'
                  />
                  <p className="text-xs text-muted-foreground">
                    Copie uniquement si l'ETag correspond
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>CopySource-If-None-Match (ETag)</Label>
                  <Input
                    value={copySourceIfNoneMatch}
                    onChange={(e) => setCopySourceIfNoneMatch(e.target.value)}
                    placeholder='"b4fb2aaa356797d9a28bfc640a973720"'
                  />
                  <p className="text-xs text-muted-foreground">
                    Copie uniquement si l'ETag ne correspond pas
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>CopySource-If-Modified-Since</Label>
                  <Input
                    type="datetime-local"
                    value={copySourceIfModifiedSince}
                    onChange={(e) => setCopySourceIfModifiedSince(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Copie uniquement si modifié après cette date
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>CopySource-If-Unmodified-Since</Label>
                  <Input
                    type="datetime-local"
                    value={copySourceIfUnmodifiedSince}
                    onChange={(e) => setCopySourceIfUnmodifiedSince(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Copie uniquement si non modifié depuis cette date
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCopying}>
            Annuler
          </Button>
          <Button onClick={handleCopy} disabled={isCopying || !destBucket || !destKey}>
            {isCopying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Copie en cours...
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 mr-2" />
                Copier
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
