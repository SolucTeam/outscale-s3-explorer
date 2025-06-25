
import { OutscaleRegion } from '../types/s3';

export const OUTSCALE_REGIONS: OutscaleRegion[] = [
  {
    id: 'eu-west-2',
    name: 'Europe Ouest 2 (Paris)',
    endpoint: 'https://oos.eu-west-2.outscale.com'
  },
  {
    id: 'us-east-2',
    name: 'US Est 2 (Ohio)',
    endpoint: 'https://oos.us-east-2.outscale.com'
  },
  {
    id: 'us-west-1',
    name: 'US Ouest 1 (Californie)',
    endpoint: 'https://oos.us-west-1.outscale.com'
  },
  {
    id: 'cloudgouv-eu-west-1',
    name: 'Cloud Gouvernemental',
    endpoint: 'https://oos.cloudgouv-eu-west-1.outscale.com'
  },
  {
    id: 'ap-northeast-1',
    name: 'Asie Pacifique Nord-Est (Tokyo)',
    endpoint: 'https://oos.ap-northeast-1.outscale.com'
  }
];
