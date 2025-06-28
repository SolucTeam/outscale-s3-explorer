import { S3Credentials } from '../types/s3';

export type StorageType = 'localStorage' | 'sessionStorage' | 'memory';

export class AuthService {
  private static instance: AuthService;
  private memoryCredentials: S3Credentials | null = null;
  private readonly STORAGE_KEY = 's3-outscale-credentials';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly TOKEN_EXPIRY_KEY = 'auth_token_expiry';

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
   * Vérifier si le token est expiré
   */
  isTokenExpired(): boolean {
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    if (!expiry) return true;
    
    const expiryTime = parseInt(expiry);
    const currentTime = Date.now();
    
    return currentTime > expiryTime;
  }

  /**
   * Définir l'expiration du token (4 heures par défaut)
   */
  setTokenExpiry(hours: number = 4): void {
    const expiryTime = Date.now() + (hours * 60 * 60 * 1000);
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Supprimer les données d'expiration du token
   */
  clearTokenExpiry(): void {
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Sauvegarder les credentials selon le type de stockage choisi
   */
  saveCredentials(credentials: S3Credentials, storageType: StorageType = 'localStorage'): void {
    const serialized = JSON.stringify(credentials);

    switch (storageType) {
      case 'localStorage':
        localStorage.setItem(this.STORAGE_KEY, this.encrypt(serialized));
        // Définir l'expiration à 4 heures
        this.setTokenExpiry(4);
        break;
      case 'sessionStorage':
        sessionStorage.setItem(this.STORAGE_KEY, this.encrypt(serialized));
        // Pour sessionStorage, on garde l'expiration mais plus courte
        this.setTokenExpiry(2);
        break;
      case 'memory':
        this.memoryCredentials = credentials;
        // Pas d'expiration pour la mémoire dans cette session
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
    this.clearTokenExpiry();
    localStorage.removeItem(this.TOKEN_KEY);
  }

  /**
   * Vérifier la validité de la session
   */
  isSessionValid(storageType: StorageType = 'localStorage'): boolean {
    if (storageType === 'memory') {
      return this.memoryCredentials !== null;
    }
    
    return this.hasCredentials(storageType) && !this.isTokenExpired();
  }
}
