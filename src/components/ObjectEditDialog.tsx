import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tag, Shield, Lock, Plus, X, RefreshCw, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { proxyS3Service } from '@/services/proxyS3Service';

interface ObjectEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucket: string;
  objectKey: string;
  object: any;
  onUpdated?: () => void;
}

export const ObjectEditDialog: React.FC<ObjectEditDialogProps> = ({
  open,
  onOpenChange,
  bucket,
  objectKey,
  object,
  onUpdated
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Tags state
  const [tags, setTags] = useState<Record<string, string>>({});
  const [newTagKey, setNewTagKey] = useState('');
  const [newTagValue, setNewTagValue] = useState('');
  
  // ACL state
  const [acl, setAcl] = useState<string>('private');
  
  // Retention state
  const [retentionMode, setRetentionMode] = useState<'COMPLIANCE' | ''>('');
  const [retentionDate, setRetentionDate] = useState<string>('');

  useEffect(() => {
    if (open) {
      loadObjectData();
    }
  }, [open, bucket, objectKey]);

  const loadObjectData = async () => {
    setLoading(true);
    try {
      // Load tags
      if (object?.tags) {
        setTags(object.tags);
      }

      // Load retention
      const retentionResponse = await proxyS3Service.getObjectRetention(bucket, objectKey);
      if (retentionResponse.success && retentionResponse.data) {
        if (retentionResponse.data.mode) {
          setRetentionMode(retentionResponse.data.mode as 'COMPLIANCE');
        }
        if (retentionResponse.data.retainUntilDate) {
          const date = new Date(retentionResponse.data.retainUntilDate);
          setRetentionDate(date.toISOString().split('T')[0]);
        }
      }
    } catch (error) {
      console.error('Error loading object data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTagKey.trim() && newTagValue.trim()) {
      setTags(prev => ({ ...prev, [newTagKey.trim()]: newTagValue.trim() }));
      setNewTagKey('');
      setNewTagValue('');
    }
  };

  const handleRemoveTag = (key: string) => {
    setTags(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleSaveTags = async () => {
    setSaving(true);
    try {
      const response = await proxyS3Service.setObjectTags(bucket, objectKey, tags);
      if (response.success) {
        toast({
          title: "Succès",
          description: "Tags mis à jour avec succès"
        });
        onUpdated?.();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les tags",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAcl = async () => {
    setSaving(true);
    try {
      const response = await proxyS3Service.setObjectAcl(bucket, objectKey, acl);
      if (response.success) {
        toast({
          title: "Succès",
          description: "ACL mis à jour avec succès"
        });
        onUpdated?.();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les ACL",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRetention = async () => {
    if (!retentionMode || !retentionDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un mode et une date de rétention",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const response = await proxyS3Service.setObjectRetention(bucket, objectKey, {
        mode: retentionMode,
        retainUntilDate: new Date(retentionDate)
      });
      if (response.success) {
        toast({
          title: "Succès",
          description: "Rétention configurée avec succès"
        });
        onUpdated?.();
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de configurer la rétention. Vérifiez que Object Lock est activé sur le bucket.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Modifier l'objet</span>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadObjectData}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </DialogTitle>
          <p className="text-sm text-muted-foreground break-all">{objectKey}</p>
        </DialogHeader>

        <Tabs defaultValue="tags" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tags">
              <Tag className="w-4 h-4 mr-2" />
              Tags
            </TabsTrigger>
            <TabsTrigger value="acl">
              <Shield className="w-4 h-4 mr-2" />
              ACL
            </TabsTrigger>
            <TabsTrigger value="retention">
              <Lock className="w-4 h-4 mr-2" />
              Rétention
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tags" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tags de l'objet</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Liste des tags existants */}
                {Object.keys(tags).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(tags).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {key}: {value}
                        <button
                          onClick={() => handleRemoveTag(key)}
                          className="ml-1 hover:text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucun tag défini</p>
                )}

                {/* Ajouter un nouveau tag */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Clé"
                      value={newTagKey}
                      onChange={(e) => setNewTagKey(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Valeur"
                      value={newTagValue}
                      onChange={(e) => setNewTagValue(e.target.value)}
                    />
                  </div>
                  <Button onClick={handleAddTag} variant="outline">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                <Button onClick={handleSaveTags} disabled={saving} className="w-full">
                  {saving ? 'Enregistrement...' : 'Enregistrer les tags'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="acl" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contrôle d'accès (ACL)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>ACL prédéfini</Label>
                  <Select value={acl} onValueChange={setAcl}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un ACL" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private">Private - Seul le propriétaire a accès</SelectItem>
                      <SelectItem value="public-read">Public Read - Lecture publique</SelectItem>
                      <SelectItem value="public-read-write">Public Read/Write - Lecture et écriture publiques</SelectItem>
                      <SelectItem value="authenticated-read">Authenticated Read - Lecture pour utilisateurs authentifiés</SelectItem>
                      <SelectItem value="bucket-owner-read">Bucket Owner Read - Lecture pour le propriétaire du bucket</SelectItem>
                      <SelectItem value="bucket-owner-full-control">Bucket Owner Full Control - Contrôle total pour le propriétaire</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleSaveAcl} disabled={saving} className="w-full">
                  {saving ? 'Enregistrement...' : 'Appliquer l\'ACL'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="retention" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Configuration de rétention</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  La rétention empêche la suppression ou la modification d'un objet pendant une période définie.
                  Object Lock doit être activé sur le bucket.
                </p>

                <div className="space-y-2">
                  <Label>Mode de rétention</Label>
                  <Select value={retentionMode} onValueChange={(v) => setRetentionMode(v as 'COMPLIANCE')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="COMPLIANCE">
                        Compliance - Protection WORM stricte
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Outscale ne supporte que le mode COMPLIANCE. La rétention ne peut pas être réduite ni supprimée avant expiration.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Conserver jusqu'au</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={retentionDate}
                      onChange={(e) => setRetentionDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <Button onClick={handleSaveRetention} disabled={saving || !retentionMode || !retentionDate} className="w-full">
                  {saving ? 'Enregistrement...' : 'Configurer la rétention'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};