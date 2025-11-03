import { OutscaleRegion } from '../types/s3';
import { env } from '../config/environment';

export class OutscaleConfig {
  private static get ENDPOINTS() {
    return env.endpoints;
  }

  static getEndpoint(region: string): string {
    return env.getEndpoint(region);
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
