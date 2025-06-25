
import { S3Credentials } from '../types/s3';

export class CredentialsValidator {
  private static readonly ACCESS_KEY_PATTERN = /^[A-Z0-9]{20}$/;
  private static readonly SECRET_KEY_PATTERN = /^[A-Za-z0-9+/]{40}$/;
  private static readonly REGION_PATTERN = /^[a-z0-9-]+$/;

  /**
   * Valider le format d'une access key
   */
  static validateAccessKey(accessKey: string): boolean {
    return this.ACCESS_KEY_PATTERN.test(accessKey);
  }

  /**
   * Valider le format d'une secret key
   */
  static validateSecretKey(secretKey: string): boolean {
    return this.SECRET_KEY_PATTERN.test(secretKey);
  }

  /**
   * Valider le format d'une région
   */
  static validateRegion(region: string): boolean {
    return this.REGION_PATTERN.test(region) && region.length >= 3;
  }

  /**
   * Valider toutes les credentials
   */
  static validateCredentials(credentials: S3Credentials): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!credentials.accessKey) {
      errors.push('Access key is required');
    } else if (!this.validateAccessKey(credentials.accessKey)) {
      errors.push('Access key format is invalid (should be 20 uppercase alphanumeric characters)');
    }

    if (!credentials.secretKey) {
      errors.push('Secret key is required');
    } else if (!this.validateSecretKey(credentials.secretKey)) {
      errors.push('Secret key format is invalid (should be 40 base64 characters)');
    }

    if (!credentials.region) {
      errors.push('Region is required');
    } else if (!this.validateRegion(credentials.region)) {
      errors.push('Region format is invalid');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Nettoyer les credentials (trim whitespace)
   */
  static sanitizeCredentials(credentials: S3Credentials): S3Credentials {
    return {
      accessKey: credentials.accessKey.trim(),
      secretKey: credentials.secretKey.trim(),
      region: credentials.region.trim()
    };
  }
}
