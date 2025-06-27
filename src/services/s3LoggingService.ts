import { useActionHistoryStore, LogLevel, ActionHistoryEntry } from '../stores/actionHistoryStore';
import { useS3Store } from '../hooks/useS3Store';

class S3LoggingService {
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

  logOperationStart(
    operationType: ActionHistoryEntry['operationType'],
    bucketName?: string,
    objectName?: string,
    details?: string
  ): string {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId) return '';
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return '';

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

    // Return the entry ID for future updates
    const entries = store.getCurrentUserEntries();
    return entries[0]?.id || '';
  }

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

  logOperationSuccess(
    entryId: string,
    operationType: ActionHistoryEntry['operationType'],
    bucketName?: string,
    objectName?: string,
    details?: string
  ): void {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId) return;
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return;

    const userMessage = this.generateUserMessage(operationType, 'success', bucketName, objectName);

    if (entryId) {
      store.updateEntry(entryId, {
        status: 'success',
        details,
        logLevel: 'info',
        userFriendlyMessage: userMessage
      });
    } else {
      store.addEntry({
        operationType,
        status: 'success',
        bucketName,
        objectName,
        details,
        logLevel: 'info',
        userFriendlyMessage: userMessage
      });
    }
  }

  logOperationError(
    entryId: string,
    operationType: ActionHistoryEntry['operationType'],
    error: Error | string,
    bucketName?: string,
    objectName?: string,
    errorCode?: string
  ): void {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId) return;
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return;

    const errorMessage = error instanceof Error ? error.message : error;
    const userMessage = this.generateUserMessage(operationType, 'error', bucketName, objectName, errorMessage);

    if (entryId) {
      store.updateEntry(entryId, {
        status: 'error',
        details: errorMessage,
        errorCode,
        logLevel: 'error',
        userFriendlyMessage: userMessage
      });
    } else {
      store.addEntry({
        operationType,
        status: 'error',
        bucketName,
        objectName,
        details: errorMessage,
        errorCode,
        logLevel: 'error',
        userFriendlyMessage: userMessage
      });
    }
  }

  private generateUserMessage(
    operationType: ActionHistoryEntry['operationType'],
    status: ActionHistoryEntry['status'],
    bucketName?: string,
    objectName?: string,
    errorMessage?: string
  ): string {
    const operationNames = {
      bucket_create: 'Création du bucket',
      bucket_delete: 'Suppression du bucket',
      object_upload: 'Upload du fichier',
      object_delete: 'Suppression de l\'objet',
      folder_create: 'Création du dossier',
      folder_delete: 'Suppression du dossier',
      object_download: 'Téléchargement de l\'objet'
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

  logBulkOperationStart(operationType: string, totalItems: number): string {
    this.ensureUserIsSet();
    const store = this.getStore();
    
    if (!store.currentUserId) return '';
    
    const currentUserHistory = store.userHistories[store.currentUserId];
    if (!currentUserHistory?.isLoggingEnabled) return '';

    store.addEntry({
      operationType: operationType as ActionHistoryEntry['operationType'],
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
}

export const s3LoggingService = new S3LoggingService();
