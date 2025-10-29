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
   * Obtient le temps restant avant expiration (en ms)
   */
  static getTimeUntilExpiration(): number {
    const data = this.loadFromSession();
    if (!data || !data.timestamp) return 0;
    
    const now = Date.now();
    const sessionAge = now - data.timestamp;
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    return Math.max(0, maxAge - sessionAge);
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

  /**
   * Démarre un timer d'avertissement d'expiration
   * Affiche un toast 5 minutes avant l'expiration
   */
  static startExpirationWarning(toastFn: (options: any) => void): () => void {
    const checkInterval = 60 * 1000; // Vérifier chaque minute
    const warningTime = 5 * 60 * 1000; // Avertir 5 minutes avant
    let warningShown = false;

    const intervalId = setInterval(() => {
      const timeRemaining = this.getTimeUntilExpiration();
      
      if (timeRemaining === 0) {
        clearInterval(intervalId);
        toastFn({
          title: "⏱️ Session expirée",
          description: "Votre session a expiré. Veuillez vous reconnecter.",
          variant: "destructive",
          duration: 10000
        });
        // Déconnecter après un court délai
        setTimeout(() => {
          this.clearSession();
          window.location.href = '/login';
        }, 2000);
      } else if (timeRemaining <= warningTime && !warningShown) {
        warningShown = true;
        const minutesLeft = Math.ceil(timeRemaining / 60000);
        toastFn({
          title: "⚠️ Session bientôt expirée",
          description: `Votre session expirera dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}. Effectuez une action pour la renouveler.`,
          variant: "default",
          duration: 8000
        });
      }
    }, checkInterval);

    // Retourner une fonction de cleanup
    return () => clearInterval(intervalId);
  }
}