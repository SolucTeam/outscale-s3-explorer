
import { apiService } from './apiService';
import { s3LoggingService } from './s3LoggingService';

export interface ForceDeleteResult {
  success: boolean;
  error?: string;
  message?: string;
  deletedObjects?: number;
}

class BucketForceDeleteService {
  // Supprimer le bucket avec l'option force du backend
  async forceDeleteBucket(bucketName: string): Promise<ForceDeleteResult> {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_delete',
      bucketName,
      undefined,
      'Suppression forcée du bucket'
    );

    try {
      // Utiliser le paramètre force=true pour que le backend gère la suppression complète
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/s3/buckets/${encodeURIComponent(bucketName)}?force=true`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (result.success) {
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'bucket_delete',
          bucketName,
          undefined,
          result.message || 'Bucket supprimé avec succès'
        );

        return {
          success: true,
          message: result.message || `Bucket "${bucketName}" et tout son contenu supprimés avec succès`
        };
      } else {
        throw new Error(result.message || 'Impossible de supprimer le bucket');
      }

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
