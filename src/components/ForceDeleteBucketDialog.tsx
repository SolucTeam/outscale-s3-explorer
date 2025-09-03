
import React, { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useEnhancedDirectS3 } from '../hooks/useEnhancedDirectS3';
import { useToast } from '@/hooks/use-toast';

interface ForceDeleteBucketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bucketName: string;
  onDeleted: () => void;
}

export const ForceDeleteBucketDialog: React.FC<ForceDeleteBucketDialogProps> = ({
  open,
  onOpenChange,
  bucketName,
  onDeleted
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();
  const { deleteBucket } = useEnhancedDirectS3();

  const handleForceDelete = async () => {
    setIsDeleting(true);
    
    try {
      const success = await deleteBucket(bucketName);
      
      if (success) {
        toast({
          title: "Suppression réussie",
          description: `Bucket "${bucketName}" supprimé avec succès`
        });
        onDeleted();
        onOpenChange(false);
      } else {
        toast({
          title: "Erreur de suppression",
          description: "Impossible de supprimer le bucket",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDialogTitle className="text-red-600">
              Supprimer le bucket et tout son contenu ?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2">
            <div>
              Cette action va <strong>définitivement supprimer</strong> le bucket <strong>"{bucketName}"</strong> et <strong>tous ses objets</strong> (fichiers et dossiers).
            </div>
            <div className="text-red-600 font-medium">
              ⚠️ Cette action est irréversible !
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        {isDeleting && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Suppression en cours...</span>
            </div>
            <Progress value={undefined} className="h-2" />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleForceDelete}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Suppression...
              </>
            ) : (
              'Supprimer définitivement'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
