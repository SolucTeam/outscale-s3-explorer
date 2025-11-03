import { OutscaleRegion } from '../types/s3';
import { env } from '../config/environment';

export const OUTSCALE_REGIONS: OutscaleRegion[] = [
  {
    id: 'eu-west-2',
    name: 'Europe Ouest 2 (Paris)',
    endpoint: env.getEndpoint('eu-west-2')
  },
  {
    id: 'us-east-2',
    name: 'US Est 2 (Ohio)',
    endpoint: env.getEndpoint('us-east-2')
  },
  {
    id: 'us-west-1',
    name: 'US Ouest 1 (Californie)',
    endpoint: env.getEndpoint('us-west-1')
  },
  {
    id: 'cloudgouv-eu-west-1',
    name: 'Cloud Gouvernemental',
    endpoint: env.getEndpoint('cloudgouv-eu-west-1')
  },
  {
    id: 'ap-northeast-1',
    name: 'Asie Pacifique Nord-Est (Tokyo)',
    endpoint: env.getEndpoint('ap-northeast-1')
  }
];
