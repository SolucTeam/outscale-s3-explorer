
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useS3Store } from '../hooks/useS3Store';
import { useBackendApi } from '../hooks/useBackendApi';
import { useToast } from '@/hooks/use-toast';
import { OUTSCALE_REGIONS } from '../data/regions';

interface CreateBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateBucketDialog = ({ open, onOpenChange }: CreateBucketDialogProps) => {
  const [bucketName, setBucketName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const { credentials } = useS3Store();
  const { createBucket, fetchBuckets } = useBackendApi();
  const { toast } = useToast();

  // Get current region info
  const currentRegion = credentials?.region || 'eu-west-2';
  const regionInfo = OUTSCALE_REGIONS.find(r => r.id === currentRegion);

  const handleCreate = async () => {
    if (!bucketName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un nom de bucket",
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
    
    await createBucket(bucketName, currentRegion);
    
    setBucketName('');
    onOpenChange(false);
    await fetchBuckets();
    
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
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-sm font-medium text-gray-700">Région et endpoint</Label>
            <div className="mt-1 space-y-1">
              <p className="text-sm text-gray-900 font-medium">{regionInfo?.name || currentRegion}</p>
              <p className="text-xs text-gray-600">{regionInfo?.endpoint || `Région: ${currentRegion}`}</p>
            </div>
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
