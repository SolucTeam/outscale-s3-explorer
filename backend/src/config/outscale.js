
const outscaleConfig = {
  regions: {
    'eu-west-2': {
      id: 'eu-west-2',
      name: 'Europe Ouest 2 (Paris)',
      endpoint: process.env.S3_ENDPOINT_EU_WEST_2 || 'https://oos.eu-west-2.outscale.com'
    },
    'us-east-2': {
      id: 'us-east-2',
      name: 'US Est 2 (Ohio)',
      endpoint: process.env.S3_ENDPOINT_US_EAST_2 || 'https://oos.us-east-2.outscale.com'
    },
    'us-west-1': {
      id: 'us-west-1',
      name: 'US Ouest 1 (Californie)',
      endpoint: process.env.S3_ENDPOINT_US_WEST_1 || 'https://oos.us-west-1.outscale.com'
    },
    'cloudgouv-eu-west-1': {
      id: 'cloudgouv-eu-west-1',
      name: 'Cloud Gouvernemental',
      endpoint: process.env.S3_ENDPOINT_CLOUDGOUV_EU_WEST_1 || 'https://oos.cloudgouv-eu-west-1.outscale.com'
    },
    'ap-northeast-1': {
      id: 'ap-northeast-1',
      name: 'Asie Pacifique Nord-Est (Tokyo)',
      endpoint: process.env.S3_ENDPOINT_AP_NORTHEAST_1 || 'https://oos.ap-northeast-1.outscale.com'
    }
  },

  getEndpoint(regionId) {
    const region = this.regions[regionId];
    return region ? region.endpoint : this.regions['eu-west-2'].endpoint;
  },

  isValidRegion(regionId) {
    return Object.keys(this.regions).includes(regionId);
  },

  getAllRegions() {
    return Object.values(this.regions);
  }
};

module.exports = outscaleConfig;
