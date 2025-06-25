
import { OutscaleRegion } from '../types/s3';

export class OutscaleConfig {
  private static readonly ENDPOINTS = {
    'eu-west-2': 'https://oos.eu-west-2.outscale.com',
    'us-east-2': 'https://oos.us-east-2.outscale.com',
    'us-west-1': 'https://oos.us-west-1.outscale.com',
    'cloudgouv-eu-west-1': 'https://oos.cloudgouv-eu-west-1.outscale.com',
    'ap-northeast-1': 'https://oos.ap-northeast-1.outscale.com'
  };

  static getEndpoint(region: string): string {
    return this.ENDPOINTS[region as keyof typeof this.ENDPOINTS] || this.ENDPOINTS['eu-west-2'];
  }

  static isValidRegion(region: string): boolean {
    return Object.keys(this.ENDPOINTS).includes(region);
  }

  static getSupportedRegions(): string[] {
    return Object.keys(this.ENDPOINTS);
  }

  static getRegionInfo(region: string): OutscaleRegion | null {
    const regionMap = {
      'eu-west-2': { id: 'eu-west-2', name: 'Europe Ouest 2 (Paris)', endpoint: this.ENDPOINTS['eu-west-2'] },
      'us-east-2': { id: 'us-east-2', name: 'US Est 2 (Ohio)', endpoint: this.ENDPOINTS['us-east-2'] },
      'us-west-1': { id: 'us-west-1', name: 'US Ouest 1 (Californie)', endpoint: this.ENDPOINTS['us-west-1'] },
      'cloudgouv-eu-west-1': { id: 'cloudgouv-eu-west-1', name: 'Cloud Gouvernemental', endpoint: this.ENDPOINTS['cloudgouv-eu-west-1'] },
      'ap-northeast-1': { id: 'ap-northeast-1', name: 'Asie Pacifique Nord-Est (Tokyo)', endpoint: this.ENDPOINTS['ap-northeast-1'] }
    };

    return regionMap[region as keyof typeof regionMap] || null;
  }
}
