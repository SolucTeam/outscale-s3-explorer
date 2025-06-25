
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { OUTSCALE_REGIONS } from '../data/regions';
import { useS3Mock } from '../hooks/useS3Mock';
import { useToast } from '@/components/ui/use-toast';

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBucketDialog = ({ open, onOpenChange }: CreateBucketDialogProps) => {
  const [bucketName, setBucketName] = useState('');
  const [region, setRegion] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { createBucket, fetchBuckets } = useS3Mock();
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!bucketName.trim() || !region) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    // Validation du nom de bucket
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
    const success = await createBucket(bucketName, region);
    
    if (success) {
      toast({
        title: "Succès",
        description: `Bucket "${bucketName}" créé avec succès`
      });
      setBucketName('');
      setRegion('');
      onOpenChange(false);
      fetchBuckets();
    }
    
    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un nouveau bucket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="bucket-name">Nom du bucket</Label>
            <Input
              id="bucket-name"
              value={bucketName}
              onChange={(e) => setBucketName(e.target.value.toLowerCase())}
              placeholder="mon-nouveau-bucket"
              disabled={isCreating}
            />
            <p className="text-sm text-gray-600 mt-1">
              3-63 caractères, minuscules, chiffres et tirets uniquement
            </p>
          </div>
          
          <div>
            <Label htmlFor="region">Région</Label>
            <Select value={region} onValueChange={setRegion} disabled={isCreating}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une région" />
              </SelectTrigger>
              <SelectContent>
                {OUTSCALE_REGIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isCreating}>
            Annuler
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Création...' : 'Créer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
