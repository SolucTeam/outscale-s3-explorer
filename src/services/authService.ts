
import { S3Credentials } from '../types/s3';

export type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

export class AuthService {
  private static instance: AuthService;
  private memoryCredentials: S3Credentials | null = null;
  private readonly STORAGE_KEY = 's3-outscale-credentials';

  private constructor() {}

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  /**
   * Chiffrement simple des credentials (pour localStorage)
   */
  private encrypt(data: string): string {
    // Implémentation basique - en production, utiliser une vraie bibliothèque de chiffrement
    return btoa(data);
  }

  private decrypt(encryptedData: string): string {
    try {
      return atob(encryptedData);
    } catch {
      return '';
    }
  }

  /**
   * Sauvegarder les credentials selon le type de stockage choisi
   */
  saveCredentials(credentials: S3Credentials, storageType: StorageType = 'localStorage'): void {
    const serialized = JSON.stringify(credentials);

    switch (storageType) {
      case 'localStorage':
        localStorage.setItem(this.STORAGE_KEY, this.encrypt(serialized));
        break;
      case 'sessionStorage':
        sessionStorage.setItem(this.STORAGE_KEY, this.encrypt(serialized));
        break;
      case 'memory':
        this.memoryCredentials = credentials;
        break;
    }
  }

  /**
   * Récupérer les credentials depuis le stockage
   */
  getCredentials(storageType: StorageType = 'localStorage'): S3Credentials | null {
    try {
      let encryptedData: string | null = null;

      switch (storageType) {
        case 'localStorage':
          encryptedData = localStorage.getItem(this.STORAGE_KEY);
          break;
        case 'sessionStorage':
          encryptedData = sessionStorage.getItem(this.STORAGE_KEY);
          break;
        case 'memory':
          return this.memoryCredentials;
      }

      if (!encryptedData) return null;

      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Erreur lors de la récupération des credentials:', error);
      return null;
    }
  }

  /**
   * Supprimer les credentials
   */
  clearCredentials(storageType: StorageType = 'localStorage'): void {
    switch (storageType) {
      case 'localStorage':
        localStorage.removeItem(this.STORAGE_KEY);
        break;
      case 'sessionStorage':
        sessionStorage.removeItem(this.STORAGE_KEY);
        break;
      case 'memory':
        this.memoryCredentials = null;
        break;
    }
  }

  /**
   * Vérifier si des credentials existent
   */
  hasCredentials(storageType: StorageType = 'localStorage'): boolean {
    return this.getCredentials(storageType) !== null;
  }

  /**
   * Valider la structure des credentials
   */
  validateCredentials(credentials: S3Credentials): boolean {
    return !!(
      credentials &&
      credentials.accessKey &&
      credentials.secretKey &&
      credentials.region &&
      credentials.accessKey.trim().length > 0 &&
      credentials.secretKey.trim().length > 0 &&
      credentials.region.trim().length > 0
    );
  }

  /**
   * Nettoyer tous les stockages
   */
  clearAllCredentials(): void {
    this.clearCredentials('localStorage');
    this.clearCredentials('sessionStorage');
    this.clearCredentials('memory');
  }
}
