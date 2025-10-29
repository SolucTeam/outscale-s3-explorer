import React from 'react';
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
import { Trash2 } from 'lucide-react';

interface DeleteObjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objectKey: string;
  isFolder: boolean;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const DeleteObjectDialog = ({
  open,
  onOpenChange,
  objectKey,
  isFolder,
  onConfirm,
  isDeleting = false
}: DeleteObjectDialogProps) => {
  const itemType = isFolder ? 'dossier' : 'fichier';
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center space-x-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            <AlertDialogTitle>
              Confirmer la suppression
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            {isFolder ? (
              <>
                Êtes-vous sûr de vouloir supprimer le dossier <strong>"{objectKey}"</strong> et tout son contenu ?
                <br />
                <span className="text-red-600 font-medium mt-2 block">
                  ⚠️ Cette action est irréversible.
                </span>
              </>
            ) : (
              <>
                Êtes-vous sûr de vouloir supprimer le {itemType} <strong>"{objectKey}"</strong> ?
                <br />
                <span className="text-red-600 font-medium mt-2 block">
                  Cette action est irréversible.
                </span>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
