
import { apiService } from './apiService';
import { s3LoggingService } from './s3LoggingService';

export interface ForceDeleteResult {
  success: boolean;
  error?: string;
  message?: string;
  deletedObjects?: number;
  debugInfo?: any;
}

class BucketForceDeleteService {
  // Supprimer le bucket avec l'option force du backend
  async forceDeleteBucket(bucketName: string, debug: boolean = true): Promise<ForceDeleteResult> {
    const logEntryId = s3LoggingService.logOperationStart(
      'bucket_delete',
      bucketName,
      undefined,
      'Suppression forcée du bucket'
    );

    try {
      console.log(`🗑️ Début suppression forcée du bucket: ${bucketName}${debug ? ' (mode debug activé)' : ''}`);
      
      // Utiliser le paramètre force=true pour que le backend gère la suppression complète
      const url = `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'}/s3/buckets/${encodeURIComponent(bucketName)}?force=true${debug ? '&debug=true' : ''}`;
      
      console.log(`📡 Envoi de la requête de suppression: ${url}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${apiService.getToken()}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`📨 Réponse reçue - Status: ${response.status}`);
      
      const result = await response.json();
      console.log('📋 Données de réponse:', result);

      if (result.success) {
        console.log(`✅ Bucket "${bucketName}" supprimé avec succès`);
        
        s3LoggingService.logOperationSuccess(
          logEntryId,
          'bucket_delete',
          bucketName,
          undefined,
          result.message || 'Bucket supprimé avec succès'
        );

        return {
          success: true,
          message: result.message || `Bucket "${bucketName}" et tout son contenu supprimés avec succès`,
          debugInfo: debug ? result.debugInfo : undefined
        };
      } else {
        console.error(`❌ Échec de suppression du bucket "${bucketName}":`, result.message);
        throw new Error(result.message || 'Impossible de supprimer le bucket');
      }

    } catch (error) {
      console.error(`💥 Erreur lors de la suppression forcée du bucket "${bucketName}":`, error);
      
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
