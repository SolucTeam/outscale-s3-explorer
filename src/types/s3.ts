
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
  hasMoreObjects?: boolean;
  versioningEnabled?: boolean;
  objectLockEnabled?: boolean;
  encryptionEnabled?: boolean;
  hasCrossAccountAccess?: boolean;
  crossAccountCount?: number;
}

export interface S3Object {
  key: string;
  lastModified: Date;
  size: number;
  etag: string;
  storageClass: string;
  isFolder: boolean;
  tags?: Record<string, string>;
  versionId?: string;
  isLatest?: boolean;
}

export interface ObjectVersion {
  versionId: string;
  key: string;
  lastModified: Date;
  size: number;
  etag: string;
  isLatest: boolean;
  storageClass: string;
}

export interface ObjectRetention {
  mode?: 'GOVERNANCE' | 'COMPLIANCE';
  retainUntilDate?: Date;
}

export interface ObjectLockConfiguration {
  enabled: boolean;
  rule?: {
    defaultRetention?: {
      mode?: 'GOVERNANCE' | 'COMPLIANCE';
      days?: number;
      years?: number;
    };
  };
}

export interface ObjectTag {
  Key: string;
  Value: string;
}

export interface BreadcrumbItem {
  name: string;
  path: string;
}

export interface LifecycleRule {
  id: string;
  status: 'Enabled' | 'Disabled';
  prefix?: string;
  expiration?: {
    days?: number;
    date?: Date;
    expiredObjectDeleteMarker?: boolean;
  };
  noncurrentVersionExpiration?: {
    noncurrentDays?: number;
  };
  abortIncompleteMultipartUpload?: {
    daysAfterInitiation?: number;
  };
  transitions?: Array<{
    days?: number;
    date?: Date;
    storageClass: string;
  }>;
}

export interface BucketLifecycleConfiguration {
  rules: LifecycleRule[];
}

export interface BucketAcl {
  owner: {
    displayName?: string;
    id: string;
  };
  grants: Array<{
    grantee: {
      type: string;
      displayName?: string;
      id?: string;
      uri?: string;
      emailAddress?: string;
    };
    permission: string;
  }>;
}

export interface BucketPolicy {
  policy?: string;
}

export interface BucketMetadata {
  region?: string;
  creationDate?: Date;
}

export interface ObjectMetadata {
  contentLength?: number;
  contentType?: string;
  lastModified?: Date;
  etag?: string;
  versionId?: string;
  metadata?: Record<string, string>;
}

export interface PresignedUrlOptions {
  expiresIn?: number; // en secondes, max 604800 (1 semaine)
}
