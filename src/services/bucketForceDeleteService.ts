
import { apiService } from './apiService';
import { s3LoggingService } from './s3LoggingService';

export interface ForceDeleteResult {
  success: boolean;
  error?: string;
  message?: string;
  deletedObjects?: number;
}

class BucketForceDeleteService {
  // Supprimer récursivement tous les objets d'un bucket
  async deleteAllObjects(bucketName: string): Promise<ForceDeleteResult> {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_delete', 
      bucketName, 
      undefined, 
      'Suppression récursive de tous les objets'
    );

    try {
      let totalDeleted = 0;
      let hasMoreObjects = true;

      // Boucle pour supprimer tous les objets par batch
      while (hasMoreObjects) {
        // Récupérer les objets du bucket
        const objectsResponse = await apiService.getObjects(bucketName, '');
        
        if (!objectsResponse.success || !objectsResponse.data) {
          throw new Error(objectsResponse.message || 'Impossible de lister les objets');
        }

        const objects = objectsResponse.data;
        
        if (objects.length === 0) {
          hasMoreObjects = false;
          break;
        }

        // Supprimer chaque objet individuellement
        for (const obj of objects) {
          try {
            const deleteResult = await apiService.deleteObject(bucketName, obj.key);
            if (deleteResult.success) {
              totalDeleted++;
            } else {
              console.warn(`Échec suppression objet ${obj.key}:`, deleteResult.error);
            }
          } catch (error) {
            console.warn(`Erreur suppression objet ${obj.key}:`, error);
          }
        }

        // Vérifier s'il reste des objets
        const checkResponse = await apiService.getObjects(bucketName, '');
        hasMoreObjects = checkResponse.success && checkResponse.data && checkResponse.data.length > 0;
      }

      s3LoggingService.logOperationSuccess(
        logEntryId,
        'bucket_delete',
        bucketName,
        undefined,
        `${totalDeleted} objets supprimés`
      );

      return {
        success: true,
        deletedObjects: totalDeleted,
        message: `${totalDeleted} objets supprimés avec succès`
      };

    } catch (error) {
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_delete',
        error instanceof Error ? error : 'Erreur lors de la suppression des objets',
        bucketName,
        undefined,
        'DELETE_OBJECTS_FAILED'
      );

      return {
        success: false,
        error: 'Erreur lors de la suppression des objets',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  // Supprimer le bucket après l'avoir vidé
  async forceDeleteBucket(bucketName: string): Promise<ForceDeleteResult> {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_delete',
      bucketName,
      undefined,
      'Suppression forcée du bucket'
    );

    try {
      // Étape 1: Vider le bucket
      const emptyResult = await this.deleteAllObjects(bucketName);
      
      if (!emptyResult.success) {
        throw new Error(emptyResult.message || 'Impossible de vider le bucket');
      }

      // Étape 2: Supprimer le bucket vide
      const deleteResult = await apiService.deleteBucket(bucketName);
      
      if (!deleteResult.success) {
        throw new Error(deleteResult.message || 'Impossible de supprimer le bucket');
      }

      s3LoggingService.logOperationSuccess(
        logEntryId,
        'bucket_delete',
        bucketName,
        undefined,
        `Bucket et ${emptyResult.deletedObjects || 0} objets supprimés`
      );

      return {
        success: true,
        deletedObjects: emptyResult.deletedObjects,
        message: `Bucket "${bucketName}" et tout son contenu (${emptyResult.deletedObjects || 0} objets) supprimés avec succès`
      };

    } catch (error) {
      s3LoggingService.logOperationError(
        logEntryId,
        'bucket_delete',
        error instanceof Error ? error : 'Erreur lors de la suppression forcée',
        bucketName,
        undefined,
        'FORCE_DELETE_FAILED'
      );

      return {
        success: false,
        error: 'Erreur lors de la suppression forcée',
        message: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }
}

export const bucketForceDeleteService = new BucketForceDeleteService();
