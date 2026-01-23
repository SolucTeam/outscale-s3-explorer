import { useActionHistoryStore, LogLevel, ActionHistoryEntry, OperationType } from '../stores/actionHistoryStore';
import { useS3Store } from '../hooks/useS3Store';

type LogMode = 'production' | 'debug';

class S3LoggingService {
  private mode: LogMode = 'production';
  
  setMode(mode: LogMode) {
    this.mode = mode;
  }

  private getStore() {
    return useActionHistoryStore.getState();
  }

  private ensureUserIsSet() {
    const store = this.getStore();
    const s3Store = useS3Store.getState();
    
    if (!store.currentUserId && s3Store.credentials) {
      const userId = `${s3Store.credentials.accessKey.substring(0, 8)}_${s3Store.credentials.region}`;
      store.setCurrentUser(userId);
    }
  }

  private log(level: 'info' | 'warn' | 'error', message: string, ...args: unknown[]) {
    if (this.mode === 'debug' || level === 'error') {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [S3] ${message}`, ...args);
    }
  }

  /**
   * 📝 Messages utilisateur pour toutes les opérations
   */
  private generateUserMessage(
    operationType: OperationType,
    status: 'started' | 'progress' | 'success' | 'error',
    bucketName?: string,
    objectName?: string,
    errorMessage?: string
  ): string {
    const operationNames: Record<OperationType, string> = {
      // Buckets
      bucket_create: 'Création du bucket',
      bucket_delete: 'Suppression du bucket',
      bucket_list: 'Liste des buckets',
      bucket_empty: 'Vidage du bucket',
      bucket_configure: 'Configuration du bucket',
      
      // Objects - Basique
      object_upload: 'Upload du fichier',
      object_delete: 'Suppression de l\'objet',
      object_download: 'Téléchargement de l\'objet',
      object_list: 'Liste des objets',
      object_view: 'Visualisation de l\'objet',
      
      // Objects - Avancé
      object_copy: 'Copie de l\'objet',
      object_move: 'Déplacement de l\'objet',
      object_rename: 'Renommage de l\'objet',
      object_restore: 'Restauration de l\'objet',
      
      // Folders
      folder_create: 'Création du dossier',
      folder_delete: 'Suppression du dossier',
      folder_move: 'Déplacement du dossier',
      folder_copy: 'Copie du dossier',
      
      // Bulk Operations
      bulk_upload: 'Upload en lot',
      bulk_delete: 'Suppression en lot',
      bulk_download: 'Téléchargement en lot',
      bulk_copy: 'Copie en lot',
      bulk_move: 'Déplacement en lot',
      
      // Metadata & Tags
      tags_add: 'Ajout de tags',
      tags_update: 'Mise à jour des tags',
      tags_delete: 'Suppression des tags',
      metadata_update: 'Mise à jour des métadonnées',
      
      // Versioning
      version_list: 'Liste des versions',
      version_restore: 'Restauration de version',
      version_delete: 'Suppression de version',
      versioning_enable: 'Activation du versioning',
      versioning_disable: 'Désactivation du versioning',
      
      // Access Control
      acl_update: 'Mise à jour des ACL',
      policy_update: 'Mise à jour de la policy',
      cors_update: 'Mise à jour du CORS',
      
      // Cross-Account Access
      share_add: 'Ajout d\'accès cross-account',
      share_update: 'Modification d\'accès cross-account',
      share_revoke: 'Révocation d\'accès cross-account',
      
      // Lifecycle
      lifecycle_add_rule: 'Ajout de règle de lifecycle',
      lifecycle_update_rule: 'Mise à jour de règle de lifecycle',
      lifecycle_delete_rule: 'Suppression de règle de lifecycle',
      
      // Replication
      replication_enable: 'Activation de la réplication',
      replication_disable: 'Désactivation de la réplication',
      replication_configure: 'Configuration de la réplication',
      
      // Encryption
      encryption_enable: 'Activation du chiffrement',
      encryption_disable: 'Désactivation du chiffrement',
      encryption_update: 'Mise à jour du chiffrement',
      
      // Object Lock
      object_lock_enable: 'Activation de l\'Object Lock',
      object_lock_configure: 'Configuration de l\'Object Lock',
      retention_set: 'Configuration de la rétention',
      legal_hold_set: 'Configuration du Legal Hold',
      
      // Logging & Monitoring
      logging_enable: 'Activation du logging',
      logging_disable: 'Désactivation du logging',
      metrics_configure: 'Configuration des métriques',
      
      // Website Hosting
      website_enable: 'Activation du site web',
      website_disable: 'Désactivation du site web',
      website_configure: 'Configuration du site web',
      
      // Notification
      notification_add: 'Ajout de notification',
      notification_update: 'Mise à jour de notification',
      notification_delete: 'Suppression de notification',
      
      // Inventory
      inventory_enable: 'Activation de l\'inventaire',
      inventory_configure: 'Configuration de l\'inventaire',
      inventory_delete: 'Suppression de l\'inventaire',
      
      // Analytics
      analytics_enable: 'Activation des analytics',
      analytics_configure: 'Configuration des analytics',
      analytics_disable: 'Désactivation des analytics',
      
      // Multipart Upload
      multipart_init: 'Initialisation upload multipart',
      multipart_upload_part: 'Upload d\'une partie',
      multipart_complete: 'Finalisation upload multipart',
      multipart_abort: 'Annulation upload multipart',
      multipart_list: 'Liste des uploads multipart',
      
      // Presigned URLs
      presigned_url_generate: 'Génération d\'URL présignée',
      presigned_url_upload: 'Upload via URL présignée',
      presigned_url_download: 'Téléchargement via URL présignée',
      
      // Transfer Acceleration
      acceleration_enable: 'Activation de l\'accélération',
      acceleration_disable: 'Désactivation de l\'accélération',
      
      // Batch Operations
      batch_job_create: 'Création de batch job',
      batch_job_status: 'Statut du batch job',
      batch_job_cancel: 'Annulation du batch job',
      
      // Storage Class
      storage_class_change: 'Changement de classe de stockage',
      storage_class_transition: 'Transition de classe de stockage',
      
      // Glacier
      glacier_archive: 'Archivage Glacier',
      glacier_restore: 'Restauration Glacier',
      glacier_retrieve: 'Récupération Glacier',
      
      // Search & Query
      select_query: 'Requête Select',
      search_objects: 'Recherche d\'objets',
      
      // Sync & Backup
      sync_start: 'Démarrage de synchronisation',
      sync_status: 'Statut de synchronisation',
      backup_create: 'Création de sauvegarde',
      backup_restore: 'Restauration de sauvegarde'
    };

    const statusMessages = {
      started: 'démarrée',
      progress: 'en cours',
      success: 'réussie',
      error: 'échouée'
    };

    const operation = operationNames[operationType] || operationType;
    const statusText = statusMessages[status] || status;
    
    let message = `${operation} ${statusText}`;
    
    if (bucketName) {
      message += ` (Bucket: ${bucketName})`;
    }
    
    if (objectName) {
      message += ` (Objet: ${objectName})`;
    }
    
    if (errorMessage && status === 'error') {
      message += ` - Erreur: ${errorMessage}`;
    }
    
    return message;
  }

  /**
   * 🚀 Démarrer une opération
   */
  logOperationStart(
    operationType: OperationType,
    bucketName?: string,
    objectName?: string,
    details?: string
  ): string {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId) return '';
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return '';

    this.log('info', `Operation started: ${operationType}`, { bucketName, objectName });

    const userMessage = this.generateUserMessage(operationType, 'started', bucketName, objectName);
    
    store.addEntry({
      operationType,
      status: 'started',
      bucketName,
      objectName,
      details,
      logLevel: 'info',
      userFriendlyMessage: userMessage
    });

    const entries = store.getCurrentUserEntries();
    return entries[0]?.id || '';
  }

  /**
   * 📊 Mettre à jour la progression
   */
  logOperationProgress(
    entryId: string,
    progress: number,
    details?: string
  ): void {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId || !entryId) return;
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return;

    store.updateEntry(entryId, {
      status: 'progress',
      progress,
      details,
      logLevel: 'info',
      userFriendlyMessage: `Progression: ${progress}%`
    });
  }

  /**
   * ✅ Marquer comme réussi
   */
  logOperationSuccess(
    entryId: string,
    operationType: OperationType,
    bucketName?: string,
    objectName?: string,
    details?: string
  ): void {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId || !entryId) return;
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return;

    this.log('info', `Operation success: ${operationType}`, { bucketName, objectName });

    const userMessage = this.generateUserMessage(operationType, 'success', bucketName, objectName);
    
    store.updateEntry(entryId, {
      status: 'success',
      details,
      logLevel: 'info',
      userFriendlyMessage: userMessage,
      progress: 100
    });
  }

  /**
   * ❌ Marquer comme échoué
   */
  logOperationError(
    entryId: string,
    operationType: OperationType,
    errorMessage: string,
    bucketName?: string,
    objectName?: string,
    errorCode?: string
  ): void {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId || !entryId) return;
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return;

    this.log('error', `Operation error: ${operationType}`, { 
      bucketName, 
      objectName, 
      errorMessage, 
      errorCode 
    });

    const userMessage = this.generateUserMessage(
      operationType, 
      'error', 
      bucketName, 
      objectName, 
      errorMessage
    );
    
    store.updateEntry(entryId, {
      status: 'error',
      details: errorMessage,
      errorCode,
      logLevel: 'error',
      userFriendlyMessage: userMessage
    });
  }

  /**
   * 📦 Opérations en lot
   */
  logBulkOperationStart(operationType: OperationType, totalItems: number): string {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId) return '';
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return '';

    store.addEntry({
      operationType,
      status: 'started',
      details: `Opération en lot: ${totalItems} éléments`,
      logLevel: 'info',
      userFriendlyMessage: `Démarrage de l'opération en lot: ${totalItems} éléments`
    });

    const entries = store.getCurrentUserEntries();
    return entries[0]?.id || '';
  }

  logBulkOperationProgress(entryId: string, completed: number, total: number): void {
    const progress = Math.round((completed / total) * 100);
    this.logOperationProgress(entryId, progress, `${completed}/${total} éléments traités`);
  }

  /**
   * ⚡ Méthodes raccourcies pour les opérations courantes
   */
  
  // Buckets
  logBucketCreate = (bucketName: string): string => 
    this.logOperationStart('bucket_create', bucketName);
  
  logBucketDelete = (bucketName: string): string => 
    this.logOperationStart('bucket_delete', bucketName);
  
  logBucketList = (): string => 
    this.logOperationStart('bucket_list');
  
  // Objects
  logObjectUpload = (bucketName: string, objectName: string): string => 
    this.logOperationStart('object_upload', bucketName, objectName);
  
  logObjectDelete = (bucketName: string, objectName: string): string => 
    this.logOperationStart('object_delete', bucketName, objectName);
  
  logObjectDownload = (bucketName: string, objectName: string): string => 
    this.logOperationStart('object_download', bucketName, objectName);
  
  logObjectCopy = (bucketName: string, objectName: string): string => 
    this.logOperationStart('object_copy', bucketName, objectName);
  
  logObjectMove = (bucketName: string, objectName: string): string => 
    this.logOperationStart('object_move', bucketName, objectName);
  
  // Folders
  logFolderCreate = (bucketName: string, folderName: string): string => 
    this.logOperationStart('folder_create', bucketName, folderName);
  
  logFolderDelete = (bucketName: string, folderName: string): string => 
    this.logOperationStart('folder_delete', bucketName, folderName);
  
  // Bulk
  logBulkUpload = (bucketName: string, count: number): string => 
    this.logBulkOperationStart('bulk_upload', count);
  
  logBulkDelete = (bucketName: string, count: number): string => 
    this.logBulkOperationStart('bulk_delete', count);
  
  // Versioning
  logVersioningEnable = (bucketName: string): string => 
    this.logOperationStart('versioning_enable', bucketName);
  
  logVersionRestore = (bucketName: string, objectName: string): string => 
    this.logOperationStart('version_restore', bucketName, objectName);
  
  // Tags
  logTagsUpdate = (bucketName: string, objectName: string): string => 
    this.logOperationStart('tags_update', bucketName, objectName);
  
  // Encryption
  logEncryptionEnable = (bucketName: string): string => 
    this.logOperationStart('encryption_enable', bucketName);
  
  // Lifecycle
  logLifecycleAddRule = (bucketName: string): string => 
    this.logOperationStart('lifecycle_add_rule', bucketName);
  
  // Multipart
  logMultipartInit = (bucketName: string, objectName: string): string => 
    this.logOperationStart('multipart_init', bucketName, objectName);
  
  // Presigned URL
  logPresignedUrlGenerate = (bucketName: string, objectName: string): string => 
    this.logOperationStart('presigned_url_generate', bucketName, objectName);
  
  // Glacier
  logGlacierArchive = (bucketName: string, objectName: string): string => 
    this.logOperationStart('glacier_archive', bucketName, objectName);
  
  logGlacierRestore = (bucketName: string, objectName: string): string => 
    this.logOperationStart('glacier_restore', bucketName, objectName);
}

export const s3LoggingService = new S3LoggingService();