
export interface OutscaleRegion {
  id: string;
  name: string;
  endpoint: string;
}

export interface S3Credentials {
  accessKey: string;
  secretKey: string;
  region: string;
}

export interface S3Bucket {
  name: string;
  creationDate: Date;
  region: string;
  location?: string;
  objectCount?: number;
  size?: number;
  versioningEnabled?: boolean;
  objectLockEnabled?: boolean;
  encryptionEnabled?: boolean;
}

export interface S3Object {
  key: string;
  lastModified: Date;
  size: number;
  etag: string;
  storageClass: string;
  isFolder: boolean;
  tags?: Record<string, string>;
}

export interface ObjectTag {
  Key: string;
  Value: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}
