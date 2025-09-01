/**
 * Service de chiffrement AES pour sécuriser les credentials S3
 * Utilise crypto-js pour le chiffrement côté client
 */

import CryptoJS from 'crypto-js';

export class EncryptionService {
  private static readonly ENCRYPTION_KEY = 'nums3-secure-key-2024';
  private static readonly STORAGE_KEY = 'nums3_encrypted_session';

  /**
   * Chiffre les credentials avec AES
   */
  static encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(jsonString, this.ENCRYPTION_KEY).toString();
    return encrypted;
  }

  /**
   * Déchiffre les credentials
   */
  static decrypt(encryptedData: string): any {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
      const jsonString = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonString);
    } catch (error) {
      console.error('Erreur déchiffrement:', error);
      return null;
    }
  }

  /**
   * Sauvegarde chiffrée en sessionStorage
   */
  static saveToSession(data: any): void {
    const encrypted = this.encrypt(data);
    sessionStorage.setItem(this.STORAGE_KEY, encrypted);
  }

  /**
   * Récupération depuis sessionStorage
   */
  static loadFromSession(): any {
    const encrypted = sessionStorage.getItem(this.STORAGE_KEY);
    if (!encrypted) return null;
    return this.decrypt(encrypted);
  }

  /**
   * Supprime les données chiffrées
   */
  static clearSession(): void {
    sessionStorage.removeItem(this.STORAGE_KEY);
    // Nettoyer aussi localStorage au cas où
    localStorage.removeItem('s3-storage');
  }

  /**
   * Vérifie si une session existe
   */
  static hasActiveSession(): boolean {
    return !!sessionStorage.getItem(this.STORAGE_KEY);
  }

  /**
   * Vérifie la validité temporelle (30min)
   */
  static isSessionValid(): boolean {
    const data = this.loadFromSession();
    if (!data || !data.timestamp) return false;
    
    const now = Date.now();
    const sessionAge = now - data.timestamp;
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    return sessionAge < maxAge;
  }

  /**
   * Auto-refresh de la session
   */
  static refreshSession(): void {
    const data = this.loadFromSession();
    if (data) {
      data.timestamp = Date.now();
      this.saveToSession(data);
    }
  }
}