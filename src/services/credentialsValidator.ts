
export class CredentialsValidator {
  // Outscale Access Key format: AKXXXXXXXXXXXXXXXX (20 chars starting with AK)
  private static readonly ACCESS_KEY_PATTERN = /^AK[A-Z0-9]{18}$/;
  
  // Outscale Secret Key format: Usually 40 characters base64-like
  private static readonly SECRET_KEY_PATTERN = /^[A-Za-z0-9+/]{40}$/;

  static validateAccessKey(accessKey: string): boolean {
    if (!accessKey || typeof accessKey !== 'string') {
      return false;
    }
    return this.ACCESS_KEY_PATTERN.test(accessKey.trim());
  }

  static validateSecretKey(secretKey: string): boolean {
    if (!secretKey || typeof secretKey !== 'string') {
      return false;
    }
    return this.SECRET_KEY_PATTERN.test(secretKey.trim());
  }

  static validateCredentials(accessKey: string, secretKey: string): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!this.validateAccessKey(accessKey)) {
      errors.push('Access Key format invalide (doit commencer par AK et contenir 20 caractères)');
    }

    if (!this.validateSecretKey(secretKey)) {
      errors.push('Secret Key format invalide (doit contenir 40 caractères alphanumériques)');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static getAccessKeyError(accessKey: string): string | null {
    if (!accessKey) return 'Access Key requis';
    if (!this.validateAccessKey(accessKey)) {
      return 'Format invalide (ex: AKXXXXXXXXXXXXXXXX)';
    }
    return null;
  }

  static getSecretKeyError(secretKey: string): string | null {
    if (!secretKey) return 'Secret Key requis';
    if (!this.validateSecretKey(secretKey)) {
      return 'Format invalide (40 caractères alphanumériques)';
    }
    return null;
  }
}
